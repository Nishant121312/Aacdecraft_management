const seedData = {
  phones: [
    { id: "ph-1", model: "Samsung A54", imei: "356712341111111", notes: "Sales coverage", employee_id: "emp-1" },
    { id: "ph-2", model: "iPhone 13", imei: "356712342222222", notes: "Regional manager", employee_id: "emp-2" },
    { id: "ph-3", model: "Redmi Note 12", imei: "356712343333333", notes: "Spare phone", employee_id: null },
    { id: "ph-4", model: "Vivo Y200", imei: "356712344444444", notes: "Support desk", employee_id: null }
  ],
  sims: [
    { id: "sim-1", provider: "Airtel", sim_number: "899110120000000001", mobile_number: "+91 98111 22334", employee_id: "emp-1" },
    { id: "sim-2", provider: "Jio", sim_number: "899110120000000002", mobile_number: "+91 98222 33445", employee_id: "emp-1" },
    { id: "sim-3", provider: "Vi", sim_number: "899110120000000003", mobile_number: "+91 98333 44556", employee_id: "emp-2" },
    { id: "sim-4", provider: "Airtel", sim_number: "899110120000000004", mobile_number: "+91 98444 55667", employee_id: null },
    { id: "sim-5", provider: "Jio", sim_number: "899110120000000005", mobile_number: "+91 98555 66778", employee_id: null }
  ],
  employees: [
    { id: "emp-1", name: "Rohit Verma", department: "Sales", notes: "Uses two SIMs for field work" },
    { id: "emp-2", name: "Neha Kapoor", department: "Operations", notes: "Single phone and SIM" }
  ]
};

const state = {
  employees: [],
  phones: [],
  sims: [],
  session: null,
  configReady: false,
  refreshHandle: null
};

const config = window.ASSET_APP_CONFIG || {};
const hasSupabaseLibrary = Boolean(window.supabase?.createClient);
const hasConfig = Boolean(config.supabaseUrl && config.supabaseAnonKey);
const supabaseClient = hasSupabaseLibrary && hasConfig
  ? window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey)
  : null;

// Debug logging
console.log("=== App Initialization ===");
console.log("Supabase library loaded:", hasSupabaseLibrary);
console.log("Config present:", hasConfig);
console.log("Supabase URL:", config.supabaseUrl);
console.log("Supabase client created:", !!supabaseClient);

const loginScreen = document.getElementById("login-screen");
const appScreen = document.getElementById("app-screen");
const loginForm = document.getElementById("login-form");
const logoutButton = document.getElementById("logout-button");
const employeeDialog = document.getElementById("employee-dialog");
const phoneDialog = document.getElementById("phone-dialog");
const simDialog = document.getElementById("sim-dialog");
const employeeForm = document.getElementById("employee-form");
const phoneForm = document.getElementById("phone-form");
const simForm = document.getElementById("sim-form");
const loginError = document.getElementById("login-error");
const setupMessage = document.getElementById("setup-message");
const storagePill = document.getElementById("storage-pill");

loginForm.addEventListener("submit", handleLogin);
logoutButton.addEventListener("click", handleLogout);
employeeForm.addEventListener("submit", handleEmployeeSave);
phoneForm.addEventListener("submit", handlePhoneSave);
simForm.addEventListener("submit", handleSimSave);
document.body.addEventListener("click", handleBodyClick);
document.addEventListener("visibilitychange", handleVisibilityRefresh);

initialize();

async function initialize() {
  if (!supabaseClient) {
    state.configReady = false;
    setSetupState();
    state.employees = structuredClone(seedData.employees);
    state.phones = structuredClone(seedData.phones);
    state.sims = structuredClone(seedData.sims);
    renderApp();
    return;
  }

  state.configReady = true;
  storagePill.textContent = "Storage: Supabase cloud";

  try {
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) {
      console.error("Session error:", error.message);
    }
    state.session = data?.session ?? null;
  } catch (err) {
    console.error("Failed to get session:", err);
    state.session = null;
  }

  syncAuthView();

  // Listen for auth changes - this is the reliable way to get session updates
  supabaseClient.auth.onAuthStateChange(async (_event, session) => {
    console.log("Auth state changed:", _event, session ? "logged in" : "logged out");
    state.session = session;
    syncAuthView();
    if (session) {
      await loadCloudData();
    } else {
      renderApp();
    }
  });

  if (state.session) {
    await loadCloudData();
  } else {
    renderApp();
  }
}

function setSetupState() {
  setupMessage.hidden = false;
  setupMessage.textContent = "Cloud backend is not connected yet. Add your Supabase URL and publishable key in config.js, then log in with the admin email and password you create in Supabase Auth.";
  storagePill.textContent = "Storage: Demo mode only";
}

function syncAuthView() {
  const loggedIn = Boolean(state.session);
  loginScreen.classList.toggle("hidden", loggedIn);
  appScreen.classList.toggle("hidden", !loggedIn);
  syncRefreshLoop();
}

async function handleLogin(event) {
  event.preventDefault();

  console.log("=== Login Attempt ===");
  
  if (!supabaseClient) {
    console.error("No Supabase client");
    showLoginError("Configure Supabase first in config.js.");
    return;
  }

  const formData = new FormData(event.currentTarget);
  const email = formData.get("username").toString().trim();
  const password = formData.get("password").toString().trim();

  console.log("Login email:", email);

  if (!email.includes("@")) {
    showLoginError("Use the admin email from Supabase Authentication, not a username.");
    return;
  }

  // Sign in and get session directly from the response
  console.log("Calling signInWithPassword...");
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  console.log("signInWithPassword result:", { error, hasSession: !!data?.session });

  if (error) {
    console.error("Login error:", error.message);
    showLoginError(error.message);
    return;
  }

  // Use session directly from signInWithPassword response
  // This is more reliable than calling getSession() immediately after
  state.session = data?.session ?? null;
  
  if (!state.session) {
    console.log("No session in response, trying getSession after delay...");
    // Fallback: try getSession after a short delay
    await new Promise(resolve => setTimeout(resolve, 500));
    const { data: sessionData } = await supabaseClient.auth.getSession();
    state.session = sessionData?.session ?? null;
    console.log("getSession result:", { hasSession: !!state.session });
  }

  if (!state.session) {
    console.error("Still no session after fallback");
    showLoginError("Login succeeded but no session was returned. Check Supabase Auth settings and site URL.");
    return;
  }

  console.log("Login successful, session:", state.session.access_token ? "token present" : "no token");
  loginError.hidden = true;
  event.currentTarget.reset();
  syncAuthView();
  await loadCloudData();
}

async function handleLogout() {
  if (!supabaseClient) {
    return;
  }

  await supabaseClient.auth.signOut();
}

function showLoginError(message) {
  loginError.hidden = false;
  loginError.textContent = message;
}

async function loadCloudData() {
  const [employeesResult, phonesResult, simsResult] = await Promise.all([
    supabaseClient.from("employees").select("*").order("created_at", { ascending: false }),
    supabaseClient.from("phones").select("*").order("created_at", { ascending: false }),
    supabaseClient.from("sims").select("*").order("created_at", { ascending: false })
  ]);

  const firstError = employeesResult.error || phonesResult.error || simsResult.error;
  if (firstError) {
    showLoginError(firstError.message);
    return;
  }

  state.employees = employeesResult.data ?? [];
  state.phones = phonesResult.data ?? [];
  state.sims = simsResult.data ?? [];
  renderApp();
}

function syncRefreshLoop() {
  if (state.refreshHandle) {
    clearInterval(state.refreshHandle);
    state.refreshHandle = null;
  }

  if (state.session && supabaseClient) {
    state.refreshHandle = window.setInterval(() => {
      loadCloudData();
    }, 20000);
  }
}

function handleVisibilityRefresh() {
  if (document.visibilityState === "visible" && state.session && supabaseClient) {
    loadCloudData();
  }
}

function renderApp() {
  renderStats();
  renderEmployees();
  renderPhones();
  renderSims();
  renderAssetLists();
}

function renderStats() {
  const assignedPhones = state.phones.filter((phone) => phone.employee_id).length;
  const availablePhones = state.phones.length - assignedPhones;
  const assignedSims = state.sims.filter((sim) => sim.employee_id).length;
  const availableSims = state.sims.length - assignedSims;

  document.getElementById("total-phones").textContent = String(state.phones.length);
  document.getElementById("assigned-phones").textContent = String(assignedPhones);
  document.getElementById("available-phones").textContent = String(availablePhones);
  document.getElementById("total-sims").textContent = String(state.sims.length);
  document.getElementById("assigned-sims").textContent = String(assignedSims);
  document.getElementById("available-sims").textContent = String(availableSims);
}

function renderEmployees() {
  const body = document.getElementById("employees-table");
  body.innerHTML = "";

  if (state.employees.length === 0) {
    body.append(createEmptyRow(5, "No employee assignments yet"));
    return;
  }

  state.employees.forEach((employee) => {
    const phones = getEmployeePhones(employee.id);
    const sims = getEmployeeSims(employee.id);
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>
        ${escapeHtml(employee.name)}
        <span class="muted-line">${escapeHtml(employee.notes || "No notes")}</span>
      </td>
      <td>${escapeHtml(employee.department || "-")}</td>
      <td>${renderAssetSummary(phones, "phone")}</td>
      <td>${renderAssetSummary(sims, "sim")}</td>
      <td>
        <div class="table-actions">
          <button type="button" class="table-button" data-edit-employee="${employee.id}">Edit</button>
          <button type="button" class="table-button" data-release-employee="${employee.id}">Release all</button>
        </div>
      </td>
    `;

    body.append(row);
  });
}

function renderPhones() {
  const body = document.getElementById("phones-table");
  body.innerHTML = "";

  if (state.phones.length === 0) {
    body.append(createEmptyRow(5, "No phones added yet"));
    return;
  }

  state.phones.forEach((phone) => {
    const employee = findEmployee(phone.employee_id);
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${escapeHtml(phone.model)}</td>
      <td>${escapeHtml(phone.imei)}</td>
      <td>${renderStatusBadge(Boolean(phone.employee_id))}</td>
      <td>${employee ? escapeHtml(employee.name) : "-"}</td>
      <td>
        <div class="table-actions">
          <button type="button" class="table-button" data-edit-phone="${phone.id}">Edit</button>
          <button type="button" class="table-button" data-unassign-phone="${phone.id}" ${phone.employee_id ? "" : "disabled"}>Unassign</button>
        </div>
      </td>
    `;

    body.append(row);
  });
}

function renderSims() {
  const body = document.getElementById("sims-table");
  body.innerHTML = "";

  if (state.sims.length === 0) {
    body.append(createEmptyRow(6, "No SIMs added yet"));
    return;
  }

  state.sims.forEach((sim) => {
    const employee = findEmployee(sim.employee_id);
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${escapeHtml(sim.provider)}</td>
      <td>${escapeHtml(sim.sim_number)}</td>
      <td>${escapeHtml(sim.mobile_number || "-")}</td>
      <td>${renderStatusBadge(Boolean(sim.employee_id))}</td>
      <td>${employee ? escapeHtml(employee.name) : "-"}</td>
      <td>
        <div class="table-actions">
          <button type="button" class="table-button" data-edit-sim="${sim.id}">Edit</button>
          <button type="button" class="table-button" data-unassign-sim="${sim.id}" ${sim.employee_id ? "" : "disabled"}>Unassign</button>
        </div>
      </td>
    `;

    body.append(row);
  });
}

function renderAssetLists() {
  const availablePhones = state.phones.filter((phone) => !phone.employee_id);
  const assignedPhones = state.phones.filter((phone) => phone.employee_id);
  const availableSims = state.sims.filter((sim) => !sim.employee_id);
  const assignedSims = state.sims.filter((sim) => sim.employee_id);

  renderList(
    document.getElementById("available-phone-list"),
    availablePhones,
    (phone) => `
      <span class="asset-main">${escapeHtml(phone.model)}</span>
      <span class="asset-meta">IMEI: ${escapeHtml(phone.imei)}</span>
    `,
    "No available phones"
  );

  renderList(
    document.getElementById("assigned-phone-list"),
    assignedPhones,
    (phone) => `
      <span class="asset-main">${escapeHtml(phone.model)}</span>
      <span class="asset-meta">IMEI: ${escapeHtml(phone.imei)} | ${escapeHtml(findEmployee(phone.employee_id)?.name || "-")}</span>
    `,
    "No assigned phones"
  );

  renderList(
    document.getElementById("available-sim-list"),
    availableSims,
    (sim) => `
      <span class="asset-main">${escapeHtml(sim.sim_number)}</span>
      <span class="asset-meta">${escapeHtml(sim.provider)} | ${escapeHtml(sim.mobile_number || "-")}</span>
    `,
    "No available SIMs"
  );

  renderList(
    document.getElementById("assigned-sim-list"),
    assignedSims,
    (sim) => `
      <span class="asset-main">${escapeHtml(sim.sim_number)}</span>
      <span class="asset-meta">${escapeHtml(sim.provider)} | ${escapeHtml(findEmployee(sim.employee_id)?.name || "-")}</span>
    `,
    "No assigned SIMs"
  );
}

function renderList(target, items, renderer, emptyText) {
  target.innerHTML = "";

  if (items.length === 0) {
    const li = document.createElement("li");
    li.className = "empty-text";
    li.textContent = emptyText;
    target.append(li);
    return;
  }

  items.forEach((item) => {
    const li = document.createElement("li");
    li.innerHTML = renderer(item);
    target.append(li);
  });
}

function renderAssetSummary(items, type) {
  if (items.length === 0) {
    return "-";
  }

  return items.map((item) => {
    if (type === "phone") {
      return `
        <div class="stack-item">
          ${escapeHtml(item.model)}
          <span class="muted-line">IMEI: ${escapeHtml(item.imei)}</span>
        </div>
      `;
    }

    return `
      <div class="stack-item">
        ${escapeHtml(item.provider)}
        <span class="muted-line">${escapeHtml(item.sim_number)}</span>
      </div>
    `;
  }).join("");
}

function renderStatusBadge(isAssigned) {
  if (isAssigned) {
    return '<span class="status-badge assigned">Assigned</span>';
  }

  return '<span class="status-badge available">Available</span>';
}

function handleBodyClick(event) {
  const target = event.target;

  if (target.matches("[data-open-employee]")) {
    openEmployeeDialog();
    return;
  }

  if (target.matches("[data-open-phone]")) {
    openPhoneDialog();
    return;
  }

  if (target.matches("[data-open-sim]")) {
    openSimDialog();
    return;
  }

  if (target.matches("[data-close-dialog]")) {
    closeDialog(target.getAttribute("data-close-dialog"));
    return;
  }

  if (target.matches("[data-edit-employee]")) {
    openEmployeeDialog(target.getAttribute("data-edit-employee"));
    return;
  }

  if (target.matches("[data-edit-phone]")) {
    openPhoneDialog(target.getAttribute("data-edit-phone"));
    return;
  }

  if (target.matches("[data-edit-sim]")) {
    openSimDialog(target.getAttribute("data-edit-sim"));
    return;
  }

  if (target.matches("[data-release-employee]")) {
    releaseEmployeeAssets(target.getAttribute("data-release-employee"));
    return;
  }

  if (target.matches("[data-unassign-phone]")) {
    unassignPhone(target.getAttribute("data-unassign-phone"));
    return;
  }

  if (target.matches("[data-unassign-sim]")) {
    unassignSim(target.getAttribute("data-unassign-sim"));
  }
}

function openEmployeeDialog(employeeId = "") {
  employeeForm.reset();
  employeeForm.elements.employeeId.value = employeeId;
  document.getElementById("employee-dialog-title").textContent = employeeId ? "Edit employee assignment" : "Create employee assignment";

  const employee = findEmployee(employeeId);
  if (employee) {
    employeeForm.elements.name.value = employee.name;
    employeeForm.elements.department.value = employee.department || "";
    employeeForm.elements.notes.value = employee.notes || "";
  }

  renderEmployeeAssetOptions(employeeId);
  employeeDialog.showModal();
}

function renderEmployeeAssetOptions(employeeId) {
  const phoneHost = document.getElementById("employee-phone-options");
  const simHost = document.getElementById("employee-sim-options");
  const employeePhoneIds = new Set(getEmployeePhones(employeeId).map((item) => item.id));
  const employeeSimIds = new Set(getEmployeeSims(employeeId).map((item) => item.id));

  phoneHost.innerHTML = "";
  simHost.innerHTML = "";

  state.phones.forEach((phone) => {
    const checked = employeePhoneIds.has(phone.id);
    const disabled = Boolean(phone.employee_id) && phone.employee_id !== employeeId;
    phoneHost.append(createCheckItem({
      name: "phoneIds",
      value: phone.id,
      checked,
      disabled,
      title: phone.model,
      subtitle: `IMEI: ${phone.imei}${phone.employee_id && !checked ? ` | ${findEmployee(phone.employee_id)?.name || ""}` : ""}`
    }));
  });

  state.sims.forEach((sim) => {
    const checked = employeeSimIds.has(sim.id);
    const disabled = Boolean(sim.employee_id) && sim.employee_id !== employeeId;
    simHost.append(createCheckItem({
      name: "simIds",
      value: sim.id,
      checked,
      disabled,
      title: `${sim.provider} - ${sim.sim_number}`,
      subtitle: `${sim.mobile_number || "No mobile number"}${sim.employee_id && !checked ? ` | ${findEmployee(sim.employee_id)?.name || ""}` : ""}`
    }));
  });
}

function createCheckItem(configItem) {
  const label = document.createElement("label");
  label.className = `check-item${configItem.disabled ? " disabled" : ""}`;
  label.innerHTML = `
    <input type="checkbox" name="${configItem.name}" value="${configItem.value}" ${configItem.checked ? "checked" : ""} ${configItem.disabled ? "disabled" : ""}>
    <span>
      <strong>${escapeHtml(configItem.title)}</strong>
      <span class="muted-line">${escapeHtml(configItem.subtitle)}</span>
    </span>
  `;
  return label;
}

function openPhoneDialog(phoneId = "") {
  phoneForm.reset();
  phoneForm.elements.phoneId.value = phoneId;
  document.getElementById("phone-dialog-title").textContent = phoneId ? "Edit phone" : "Add phone";
  const phone = findPhone(phoneId);

  if (phone) {
    phoneForm.elements.model.value = phone.model;
    phoneForm.elements.imei.value = phone.imei;
    phoneForm.elements.notes.value = phone.notes || "";
  }

  phoneDialog.showModal();
}

function openSimDialog(simId = "") {
  simForm.reset();
  simForm.elements.simId.value = simId;
  document.getElementById("sim-dialog-title").textContent = simId ? "Edit SIM" : "Add SIM";
  const sim = findSim(simId);

  if (sim) {
    simForm.elements.provider.value = sim.provider;
    simForm.elements.simNumber.value = sim.sim_number;
    simForm.elements.mobileNumber.value = sim.mobile_number || "";
  }

  simDialog.showModal();
}

async function handleEmployeeSave(event) {
  event.preventDefault();
  if (!supabaseClient) {
    return;
  }

  const formData = new FormData(employeeForm);
  const employeeId = formData.get("employeeId").toString().trim();
  const selectedPhoneIds = new Set(formData.getAll("phoneIds").map(String));
  const selectedSimIds = new Set(formData.getAll("simIds").map(String));

  const employeePayload = {
    name: formData.get("name").toString().trim(),
    department: formData.get("department").toString().trim(),
    notes: formData.get("notes").toString().trim()
  };

  if (employeeId) {
    employeePayload.id = employeeId;
  }

  const { data: employeeRows, error: employeeError } = await supabaseClient
    .from("employees")
    .upsert(employeePayload)
    .select();

  if (employeeError) {
    showLoginError(employeeError.message);
    return;
  }

  const savedEmployeeId = employeeRows[0].id;

  const phoneUpdates = state.phones
    .filter((phone) => phone.employee_id === savedEmployeeId || selectedPhoneIds.has(phone.id))
    .map((phone) => ({
      id: phone.id,
      model: phone.model,
      imei: phone.imei,
      notes: phone.notes || "",
      employee_id: selectedPhoneIds.has(phone.id) ? savedEmployeeId : null
    }));

  const simUpdates = state.sims
    .filter((sim) => sim.employee_id === savedEmployeeId || selectedSimIds.has(sim.id))
    .map((sim) => ({
      id: sim.id,
      provider: sim.provider,
      sim_number: sim.sim_number,
      mobile_number: sim.mobile_number || "",
      employee_id: selectedSimIds.has(sim.id) ? savedEmployeeId : null
    }));

  if (phoneUpdates.length > 0) {
    const { error } = await supabaseClient.from("phones").upsert(phoneUpdates);
    if (error) {
      showLoginError(error.message);
      return;
    }
  }

  if (simUpdates.length > 0) {
    const { error } = await supabaseClient.from("sims").upsert(simUpdates);
    if (error) {
      showLoginError(error.message);
      return;
    }
  }

  closeDialog("employee-dialog");
  await loadCloudData();
}

async function handlePhoneSave(event) {
  event.preventDefault();
  if (!supabaseClient) {
    return;
  }

  const formData = new FormData(phoneForm);
  const payload = {
    model: formData.get("model").toString().trim(),
    imei: formData.get("imei").toString().trim(),
    notes: formData.get("notes").toString().trim()
  };

  const phoneId = formData.get("phoneId").toString().trim();
  if (phoneId) {
    payload.id = phoneId;
    payload.employee_id = findPhone(phoneId)?.employee_id ?? null;
  }

  const { error } = await supabaseClient.from("phones").upsert(payload);
  if (error) {
    showLoginError(error.message);
    return;
  }

  closeDialog("phone-dialog");
  await loadCloudData();
}

async function handleSimSave(event) {
  event.preventDefault();
  if (!supabaseClient) {
    return;
  }

  const formData = new FormData(simForm);
  const payload = {
    provider: formData.get("provider").toString().trim(),
    sim_number: formData.get("simNumber").toString().trim(),
    mobile_number: formData.get("mobileNumber").toString().trim()
  };

  const simId = formData.get("simId").toString().trim();
  if (simId) {
    payload.id = simId;
    payload.employee_id = findSim(simId)?.employee_id ?? null;
  }

  const { error } = await supabaseClient.from("sims").upsert(payload);
  if (error) {
    showLoginError(error.message);
    return;
  }

  closeDialog("sim-dialog");
  await loadCloudData();
}

async function releaseEmployeeAssets(employeeId) {
  if (!supabaseClient) {
    return;
  }

  const phoneUpdates = getEmployeePhones(employeeId).map((phone) => ({
    id: phone.id,
    model: phone.model,
    imei: phone.imei,
    notes: phone.notes || "",
    employee_id: null
  }));
  const simUpdates = getEmployeeSims(employeeId).map((sim) => ({
    id: sim.id,
    provider: sim.provider,
    sim_number: sim.sim_number,
    mobile_number: sim.mobile_number || "",
    employee_id: null
  }));

  if (phoneUpdates.length > 0) {
    const { error } = await supabaseClient.from("phones").upsert(phoneUpdates);
    if (error) {
      showLoginError(error.message);
      return;
    }
  }

  if (simUpdates.length > 0) {
    const { error } = await supabaseClient.from("sims").upsert(simUpdates);
    if (error) {
      showLoginError(error.message);
      return;
    }
  }

  await loadCloudData();
}

async function unassignPhone(phoneId) {
  if (!supabaseClient) {
    return;
  }

  const { error } = await supabaseClient.from("phones").update({ employee_id: null }).eq("id", phoneId);
  if (error) {
    showLoginError(error.message);
    return;
  }

  await loadCloudData();
}

async function unassignSim(simId) {
  if (!supabaseClient) {
    return;
  }

  const { error } = await supabaseClient.from("sims").update({ employee_id: null }).eq("id", simId);
  if (error) {
    showLoginError(error.message);
    return;
  }

  await loadCloudData();
}

function closeDialog(dialogId) {
  const dialog = document.getElementById(dialogId);
  if (dialog.open) {
    dialog.close();
  }
}

function getEmployeePhones(employeeId) {
  return state.phones.filter((phone) => phone.employee_id === employeeId);
}

function getEmployeeSims(employeeId) {
  return state.sims.filter((sim) => sim.employee_id === employeeId);
}

function findEmployee(employeeId) {
  return state.employees.find((employee) => employee.id === employeeId);
}

function findPhone(phoneId) {
  return state.phones.find((phone) => phone.id === phoneId);
}

function findSim(simId) {
  return state.sims.find((sim) => sim.id === simId);
}

function createEmptyRow(colspan, text) {
  const row = document.createElement("tr");
  row.innerHTML = `<td colspan="${colspan}" class="empty-text">${escapeHtml(text)}</td>`;
  return row;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
