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
    { id: "emp-1", employee_id: "EMP-1001", name: "Rohit Verma", notes: "Uses two SIMs for field work" },
    { id: "emp-2", employee_id: "EMP-1002", name: "Neha Kapoor", notes: "Single phone and SIM" }
  ]
};

const STORAGE_KEYS = {
  localSession: "asset-app-local-session-v2",
  localData: "asset-app-local-data-v2"
};

const urlParams = new URLSearchParams(window.location.search);
const isDemoMode = urlParams.get("demo") === "true";

const state = {
  employees: [],
  phones: [],
  sims: [],
  session: null,
  authMode: "logged-out",
  storageMode: "booting",
  configReady: false,
  refreshHandle: null,
  authSubscription: null,
  searchQuery: ""
};

const config = window.ASSET_APP_CONFIG || {};
const hasSupabaseLibrary = Boolean(window.supabase?.createClient);
const hasConfig = Boolean(config.supabaseUrl && config.supabaseAnonKey);
const supabaseClient = hasSupabaseLibrary && hasConfig
  ? window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey)
  : null;

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
const appMessage = document.getElementById("app-message");
const localSessionButton = document.getElementById("local-session-button");
const employeeSearchInput = document.getElementById("employee-search-input");
const employeeSearchResult = document.getElementById("employee-search-result");

loginForm.addEventListener("submit", handleLogin);
logoutButton.addEventListener("click", handleLogout);
employeeForm.addEventListener("submit", handleEmployeeSave);
phoneForm.addEventListener("submit", handlePhoneSave);
simForm.addEventListener("submit", handleSimSave);
document.body.addEventListener("click", handleBodyClick);
document.addEventListener("visibilitychange", handleVisibilityRefresh);
localSessionButton?.addEventListener("click", handleLocalSessionLogin);
employeeSearchInput?.addEventListener("input", handleEmployeeSearch);

initialize();

async function initialize() {
  state.configReady = Boolean(supabaseClient);
  setLoggedOutMessage();

  if (isDemoMode) {
    startLocalSession("demo@asset.local", "Storage: Local demo session", "Demo mode is using the bundled sample data in this browser.");
    return;
  }

  if (supabaseClient) {
    await restoreCloudSession();
    registerAuthListener();
  }

  if (state.session && state.authMode === "cloud") {
    syncAuthView();
    await loadCloudData({ seedIfEmpty: true });
    return;
  }

  const localSession = readStoredLocalSession();
  if (localSession) {
    restoreLocalSession(localSession);
    return;
  }

  clearWorkingData();
  syncAuthView();
}

function registerAuthListener() {
  if (!supabaseClient || state.authSubscription) {
    return;
  }

  const { data } = supabaseClient.auth.onAuthStateChange(async (_event, session) => {
    if (state.authMode === "local" && !session) {
      return;
    }

    if (session) {
      state.session = session;
      state.authMode = "cloud";
      syncAuthView();
      await loadCloudData({ seedIfEmpty: true });
      return;
    }

    state.session = null;
    state.authMode = "logged-out";
    clearWorkingData();
    syncAuthView();
    setLoggedOutMessage();
  });

  state.authSubscription = data.subscription;
}

async function restoreCloudSession() {
  try {
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) {
      showLoginError(error.message);
      return;
    }

    if (data?.session) {
      state.session = data.session;
      state.authMode = "cloud";
    }
  } catch (error) {
    console.error("Failed to restore cloud session", error);
  }
}

function setLoggedOutMessage() {
  setupMessage.hidden = false;

  if (supabaseClient) {
    setupMessage.textContent = "Use your Supabase admin email and password for cloud data, or continue with a local browser session if you want the app to work without the database.";
    return;
  }

  setupMessage.textContent = "Supabase is not available here, so this app will use a local browser session with sample data. That local data stays in this browser tab and can survive a refresh.";
}

function syncAuthView() {
  const loggedIn = Boolean(state.session);
  loginScreen.classList.toggle("hidden", loggedIn);
  appScreen.classList.toggle("hidden", !loggedIn);
  syncRefreshLoop();
}

async function handleLogin(event) {
  event.preventDefault();
  hideLoginError();

  const formData = new FormData(event.currentTarget);
  const email = formData.get("username").toString().trim();
  const password = formData.get("password").toString().trim();

  if (!email || !email.includes("@")) {
    showLoginError("Enter a valid admin email address.");
    return;
  }

  if (!password) {
    showLoginError("Enter the password to continue.");
    return;
  }

  if (!supabaseClient) {
    startLocalSession(email, "Storage: Local browser session", "Cloud login is unavailable here, so the app is using local browser data.");
    event.currentTarget.reset();
    return;
  }

  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      showLoginError(`${error.message} You can still use the local browser session button below.`);
      return;
    }

    state.session = data?.session ?? null;
    if (!state.session) {
      const { data: sessionData } = await supabaseClient.auth.getSession();
      state.session = sessionData?.session ?? null;
    }

    if (!state.session) {
      showLoginError("Login did not return a session. Check the Supabase auth settings and allowed site URL.");
      return;
    }

    state.authMode = "cloud";
    clearStoredLocalSession();
    event.currentTarget.reset();
    syncAuthView();
    await loadCloudData({ seedIfEmpty: true });
  } catch (error) {
    console.error("Login failed", error);
    showLoginError("Cloud login failed unexpectedly. You can use the local browser session as a fallback.");
  }
}

function handleLocalSessionLogin() {
  hideLoginError();
  const email = loginForm.elements.username.value.trim() || "admin@asset.local";
  startLocalSession(email, "Storage: Local browser session", "The app is running against local sample data in this browser tab.");
}

async function handleLogout() {
  clearStoredLocalSession();
  hideAppMessage();

  if (state.authMode === "cloud" && supabaseClient) {
    try {
      await supabaseClient.auth.signOut();
    } catch (error) {
      console.error("Cloud logout failed", error);
    }
  }

  state.session = null;
  state.authMode = "logged-out";
  clearWorkingData();
  syncAuthView();
  setLoggedOutMessage();
}

function startLocalSession(email, pillText, messageText) {
  state.session = {
    mode: "local",
    user: { email }
  };
  state.authMode = "local";
  state.storageMode = "local";
  writeStoredLocalSession({ email });
  hydrateLocalData();
  setStoragePill(pillText);
  showAppMessage(messageText);
  hideLoginError();
  syncAuthView();
  renderApp();
}

function restoreLocalSession(sessionData) {
  startLocalSession(
    sessionData.email || "admin@asset.local",
    "Storage: Local browser session",
    "Restored your browser session data from this tab."
  );
}

function hydrateLocalData() {
  const stored = readStoredLocalData();
  const nextData = normalizeData(stored || cloneSeedData());
  state.employees = nextData.employees;
  state.phones = nextData.phones;
  state.sims = nextData.sims;
  persistLocalData();
}

async function loadCloudData(options = {}) {
  if (!supabaseClient || !state.session) {
    return false;
  }

  hideLoginError();

  try {
    const [employeesResult, phonesResult, simsResult] = await Promise.all([
      supabaseClient.from("employees").select("*").order("created_at", { ascending: false }),
      supabaseClient.from("phones").select("*").order("created_at", { ascending: false }),
      supabaseClient.from("sims").select("*").order("created_at", { ascending: false })
    ]);

    const firstError = employeesResult.error || phonesResult.error || simsResult.error;
    if (firstError) {
      showAppMessage(`Cloud data is unavailable right now: ${firstError.message}. Falling back to local browser data.`);
      startCloudFallback();
      return false;
    }

    const employees = employeesResult.data ?? [];
    const phones = phonesResult.data ?? [];
    const sims = simsResult.data ?? [];
    const isEmpty = employees.length === 0 && phones.length === 0 && sims.length === 0;

    if (isEmpty && options.seedIfEmpty) {
      const seeded = await initializeDatabaseWithSeedData();
      if (seeded) {
        return loadCloudData({ seedIfEmpty: false });
      }
    }

    if (isEmpty) {
      showAppMessage("Cloud tables are still empty, so the dashboard is using local sample data for now.");
      startCloudFallback();
      return false;
    }

    state.storageMode = "cloud";
    state.employees = normalizeEmployees(employees);
    state.phones = phones;
    state.sims = sims;
    setStoragePill("Storage: Supabase cloud");
    showAppMessage("Connected to Supabase cloud data.");
    renderApp();
    return true;
  } catch (error) {
    console.error("Cloud data load failed", error);
    showAppMessage("Cloud data could not be loaded, so the app switched to local browser data.");
    startCloudFallback();
    return false;
  }
}

function startCloudFallback() {
  state.storageMode = "local-fallback";
  hydrateLocalData();
  setStoragePill("Storage: Local browser fallback");
  renderApp();
}

async function initializeDatabaseWithSeedData() {
  if (!supabaseClient) {
    return false;
  }

  try {
    const { data: existingEmployees, error: existingEmployeesError } = await supabaseClient
      .from("employees")
      .select("id")
      .limit(1);

    if (existingEmployeesError) {
      return false;
    }

    if (existingEmployees.length > 0) {
      return true;
    }

    const { data: insertedEmployees, error: employeeError } = await supabaseClient
      .from("employees")
      .insert(seedData.employees.map((employee) => ({
        name: employee.name,
        employee_id: employee.employee_id,
        notes: employee.notes
      })))
      .select("id, employee_id");

    if (employeeError || !insertedEmployees) {
      return false;
    }

    const employeeIdByCode = new Map(insertedEmployees.map((employee) => [employee.employee_id, employee.id]));

    const { error: phoneError } = await supabaseClient
      .from("phones")
      .insert(seedData.phones.map((phone) => ({
        model: phone.model,
        imei: phone.imei,
        notes: phone.notes,
        employee_id: phone.employee_id
          ? employeeIdByCode.get(seedData.employees.find((employee) => employee.id === phone.employee_id)?.employee_id || "")
          : null
      })));

    if (phoneError) {
      return false;
    }

    const { error: simError } = await supabaseClient
      .from("sims")
      .insert(seedData.sims.map((sim) => ({
        provider: sim.provider,
        sim_number: sim.sim_number,
        mobile_number: sim.mobile_number,
        employee_id: sim.employee_id
          ? employeeIdByCode.get(seedData.employees.find((employee) => employee.id === sim.employee_id)?.employee_id || "")
          : null
      })));

    return !simError;
  } catch (error) {
    console.error("Cloud seed failed", error);
    return false;
  }
}

function syncRefreshLoop() {
  if (state.refreshHandle) {
    clearInterval(state.refreshHandle);
    state.refreshHandle = null;
  }

  if (state.authMode === "cloud" && supabaseClient) {
    state.refreshHandle = window.setInterval(() => {
      loadCloudData({ seedIfEmpty: false });
    }, 20000);
  }
}

function handleVisibilityRefresh() {
  if (document.visibilityState !== "visible") {
    return;
  }

  if (state.authMode === "cloud" && supabaseClient) {
    loadCloudData({ seedIfEmpty: false });
    return;
  }

  if (state.authMode === "local") {
    hydrateLocalData();
    renderApp();
  }
}

function handleEmployeeSearch(event) {
  state.searchQuery = event.currentTarget.value.trim();
  renderEmployeeSearch();
}

function renderApp() {
  renderStats();
  renderEmployees();
  renderPhones();
  renderSims();
  renderAssetLists();
  renderEmployeeSearch();
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
      <td>${escapeHtml(employee.employee_id || "-")}</td>
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
      <td>${employee ? escapeHtml(`${employee.name} (${employee.employee_id})`) : "-"}</td>
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
      <td>${employee ? escapeHtml(`${employee.name} (${employee.employee_id})`) : "-"}</td>
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
      <span class="asset-meta">IMEI: ${escapeHtml(phone.imei)} | ${escapeHtml(formatEmployeeLabel(findEmployee(phone.employee_id)))}</span>
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
      <span class="asset-meta">${escapeHtml(sim.provider)} | ${escapeHtml(formatEmployeeLabel(findEmployee(sim.employee_id)))}</span>
    `,
    "No assigned SIMs"
  );
}

function renderEmployeeSearch() {
  if (!employeeSearchResult) {
    return;
  }

  const query = normalizeEmployeeCode(state.searchQuery);
  if (!query) {
    employeeSearchResult.className = "search-result empty-text";
    employeeSearchResult.textContent = "Search by Employee ID to view assigned phones and SIMs.";
    return;
  }

  const employee = findEmployeeByCode(query);
  if (!employee) {
    employeeSearchResult.className = "search-result empty-text";
    employeeSearchResult.textContent = "No employee found";
    return;
  }

  const phones = getEmployeePhones(employee.id);
  const sims = getEmployeeSims(employee.id);
  employeeSearchResult.className = "search-result";
  employeeSearchResult.innerHTML = `
    <div class="search-result-card">
      <div class="search-result-head">
        <div>
          <div class="search-result-name">${escapeHtml(employee.name)}</div>
          <div class="search-result-meta">Employee ID: ${escapeHtml(employee.employee_id || "-")}</div>
        </div>
        <div class="search-result-meta">${escapeHtml(employee.notes || "No notes")}</div>
      </div>
      <div class="search-result-grid">
        <div class="mini-card">
          <h3>Assigned phones</h3>
          <ul class="asset-list">${renderSearchAssetItems(phones, "phone")}</ul>
        </div>
        <div class="mini-card">
          <h3>Assigned SIMs</h3>
          <ul class="asset-list">${renderSearchAssetItems(sims, "sim")}</ul>
        </div>
      </div>
    </div>
  `;
}

function renderSearchAssetItems(items, type) {
  if (items.length === 0) {
    return '<li class="empty-text">None assigned</li>';
  }

  return items.map((item) => {
    if (type === "phone") {
      return `
        <li>
          <span class="asset-main">${escapeHtml(item.model)}</span>
          <span class="asset-meta">IMEI: ${escapeHtml(item.imei)}</span>
        </li>
      `;
    }

    return `
      <li>
        <span class="asset-main">${escapeHtml(item.provider)}</span>
        <span class="asset-meta">${escapeHtml(item.sim_number)} | ${escapeHtml(item.mobile_number || "-")}</span>
      </li>
    `;
  }).join("");
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
    employeeForm.elements.employeeCode.value = employee.employee_id || "";
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
      subtitle: `IMEI: ${phone.imei}${phone.employee_id && !checked ? ` | ${formatEmployeeLabel(findEmployee(phone.employee_id))}` : ""}`
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
      subtitle: `${sim.mobile_number || "No mobile number"}${sim.employee_id && !checked ? ` | ${formatEmployeeLabel(findEmployee(sim.employee_id))}` : ""}`
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
  hideLoginError();

  const formData = new FormData(employeeForm);
  const recordId = formData.get("employeeId").toString().trim();
  const selectedPhoneIds = new Set(formData.getAll("phoneIds").map(String));
  const selectedSimIds = new Set(formData.getAll("simIds").map(String));
  const employeeCode = normalizeEmployeeCode(formData.get("employeeCode"));
  const name = formData.get("name").toString().trim();
  const notes = formData.get("notes").toString().trim();

  const duplicateEmployee = state.employees.find((employee) => employee.employee_id === employeeCode && employee.id !== recordId);
  if (!employeeCode) {
    showAppMessage("Employee ID is required.");
    return;
  }

  if (duplicateEmployee) {
    showAppMessage("Employee ID must be unique.");
    return;
  }

  if (isCloudMode()) {
    const employeePayload = {
      name,
      employee_id: employeeCode,
      notes
    };

    if (recordId) {
      employeePayload.id = recordId;
    }

    const { data: employeeRows, error: employeeError } = await supabaseClient
      .from("employees")
      .upsert(employeePayload)
      .select();

    if (employeeError) {
      showAppMessage(employeeError.message);
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
        showAppMessage(error.message);
        return;
      }
    }

    if (simUpdates.length > 0) {
      const { error } = await supabaseClient.from("sims").upsert(simUpdates);
      if (error) {
        showAppMessage(error.message);
        return;
      }
    }

    closeDialog("employee-dialog");
    await loadCloudData({ seedIfEmpty: false });
    return;
  }

  saveEmployeeLocally({
    id: recordId,
    employee_id: employeeCode,
    name,
    notes,
    selectedPhoneIds,
    selectedSimIds
  });
  closeDialog("employee-dialog");
}

async function handlePhoneSave(event) {
  event.preventDefault();
  hideLoginError();

  const formData = new FormData(phoneForm);
  const phoneId = formData.get("phoneId").toString().trim();
  const payload = {
    model: formData.get("model").toString().trim(),
    imei: formData.get("imei").toString().trim(),
    notes: formData.get("notes").toString().trim()
  };

  if (isCloudMode()) {
    if (phoneId) {
      payload.id = phoneId;
      payload.employee_id = findPhone(phoneId)?.employee_id ?? null;
    }

    const { error } = await supabaseClient.from("phones").upsert(payload);
    if (error) {
      showAppMessage(error.message);
      return;
    }

    closeDialog("phone-dialog");
    await loadCloudData({ seedIfEmpty: false });
    return;
  }

  savePhoneLocally(phoneId, payload);
  closeDialog("phone-dialog");
}

async function handleSimSave(event) {
  event.preventDefault();
  hideLoginError();

  const formData = new FormData(simForm);
  const simId = formData.get("simId").toString().trim();
  const payload = {
    provider: formData.get("provider").toString().trim(),
    sim_number: formData.get("simNumber").toString().trim(),
    mobile_number: formData.get("mobileNumber").toString().trim()
  };

  if (isCloudMode()) {
    if (simId) {
      payload.id = simId;
      payload.employee_id = findSim(simId)?.employee_id ?? null;
    }

    const { error } = await supabaseClient.from("sims").upsert(payload);
    if (error) {
      showAppMessage(error.message);
      return;
    }

    closeDialog("sim-dialog");
    await loadCloudData({ seedIfEmpty: false });
    return;
  }

  saveSimLocally(simId, payload);
  closeDialog("sim-dialog");
}

async function releaseEmployeeAssets(employeeId) {
  if (isCloudMode()) {
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
        showAppMessage(error.message);
        return;
      }
    }

    if (simUpdates.length > 0) {
      const { error } = await supabaseClient.from("sims").upsert(simUpdates);
      if (error) {
        showAppMessage(error.message);
        return;
      }
    }

    await loadCloudData({ seedIfEmpty: false });
    return;
  }

  state.phones.forEach((phone) => {
    if (phone.employee_id === employeeId) {
      phone.employee_id = null;
    }
  });

  state.sims.forEach((sim) => {
    if (sim.employee_id === employeeId) {
      sim.employee_id = null;
    }
  });

  persistLocalData();
  renderApp();
}

async function unassignPhone(phoneId) {
  if (isCloudMode()) {
    const { error } = await supabaseClient.from("phones").update({ employee_id: null }).eq("id", phoneId);
    if (error) {
      showAppMessage(error.message);
      return;
    }

    await loadCloudData({ seedIfEmpty: false });
    return;
  }

  const phone = findPhone(phoneId);
  if (!phone) {
    return;
  }

  phone.employee_id = null;
  persistLocalData();
  renderApp();
}

async function unassignSim(simId) {
  if (isCloudMode()) {
    const { error } = await supabaseClient.from("sims").update({ employee_id: null }).eq("id", simId);
    if (error) {
      showAppMessage(error.message);
      return;
    }

    await loadCloudData({ seedIfEmpty: false });
    return;
  }

  const sim = findSim(simId);
  if (!sim) {
    return;
  }

  sim.employee_id = null;
  persistLocalData();
  renderApp();
}

function saveEmployeeLocally(details) {
  let employee = details.id ? findEmployee(details.id) : null;
  const employeeRecordId = employee?.id || createId("emp");

  if (employee) {
    employee.name = details.name;
    employee.employee_id = details.employee_id;
    employee.notes = details.notes;
  } else {
    employee = {
      id: employeeRecordId,
      employee_id: details.employee_id,
      name: details.name,
      notes: details.notes
    };
    state.employees.unshift(employee);
  }

  state.phones.forEach((phone) => {
    if (phone.employee_id === employeeRecordId && !details.selectedPhoneIds.has(phone.id)) {
      phone.employee_id = null;
    }

    if (details.selectedPhoneIds.has(phone.id)) {
      phone.employee_id = employeeRecordId;
    }
  });

  state.sims.forEach((sim) => {
    if (sim.employee_id === employeeRecordId && !details.selectedSimIds.has(sim.id)) {
      sim.employee_id = null;
    }

    if (details.selectedSimIds.has(sim.id)) {
      sim.employee_id = employeeRecordId;
    }
  });

  persistLocalData();
  renderApp();
}

function savePhoneLocally(phoneId, payload) {
  const existing = phoneId ? findPhone(phoneId) : null;

  if (existing) {
    existing.model = payload.model;
    existing.imei = payload.imei;
    existing.notes = payload.notes;
  } else {
    state.phones.unshift({
      id: createId("ph"),
      model: payload.model,
      imei: payload.imei,
      notes: payload.notes,
      employee_id: null
    });
  }

  persistLocalData();
  renderApp();
}

function saveSimLocally(simId, payload) {
  const existing = simId ? findSim(simId) : null;

  if (existing) {
    existing.provider = payload.provider;
    existing.sim_number = payload.sim_number;
    existing.mobile_number = payload.mobile_number;
  } else {
    state.sims.unshift({
      id: createId("sim"),
      provider: payload.provider,
      sim_number: payload.sim_number,
      mobile_number: payload.mobile_number,
      employee_id: null
    });
  }

  persistLocalData();
  renderApp();
}

function persistLocalData() {
  try {
    sessionStorage.setItem(STORAGE_KEYS.localData, JSON.stringify({
      employees: state.employees,
      phones: state.phones,
      sims: state.sims
    }));
  } catch (error) {
    console.error("Failed to persist local data", error);
  }
}

function readStoredLocalData() {
  try {
    const rawValue = sessionStorage.getItem(STORAGE_KEYS.localData);
    if (!rawValue) {
      return null;
    }

    return normalizeData(JSON.parse(rawValue));
  } catch (error) {
    console.error("Failed to read local data", error);
    return null;
  }
}

function writeStoredLocalSession(sessionData) {
  try {
    sessionStorage.setItem(STORAGE_KEYS.localSession, JSON.stringify(sessionData));
  } catch (error) {
    console.error("Failed to store local session", error);
  }
}

function readStoredLocalSession() {
  try {
    const rawValue = sessionStorage.getItem(STORAGE_KEYS.localSession);
    return rawValue ? JSON.parse(rawValue) : null;
  } catch (error) {
    console.error("Failed to read local session", error);
    return null;
  }
}

function clearStoredLocalSession() {
  sessionStorage.removeItem(STORAGE_KEYS.localSession);
}

function clearWorkingData() {
  state.employees = [];
  state.phones = [];
  state.sims = [];
  renderApp();
}

function normalizeData(rawData) {
  if (!rawData || !Array.isArray(rawData.employees) || !Array.isArray(rawData.phones) || !Array.isArray(rawData.sims)) {
    return null;
  }

  return {
    employees: normalizeEmployees(rawData.employees),
    phones: rawData.phones,
    sims: rawData.sims
  };
}

function normalizeEmployees(employees) {
  return employees.map((employee, index) => ({
    ...employee,
    employee_id: resolveEmployeeCode(employee, index),
    notes: employee.notes || ""
  }));
}

function generateEmployeeCode(index) {
  return `EMP-${String(index + 1001).padStart(4, "0")}`;
}

function resolveEmployeeCode(employee, index) {
  const existingCode = normalizeEmployeeCode(employee.employee_id);
  const legacyDepartment = normalizeEmployeeCode(employee.department);
  if (existingCode && existingCode !== legacyDepartment) {
    return existingCode;
  }

  return normalizeEmployeeCode(generateEmployeeCode(index));
}

function normalizeEmployeeCode(value) {
  return String(value || "").trim().toUpperCase();
}

function formatEmployeeLabel(employee) {
  if (!employee) {
    return "-";
  }

  return `${employee.name} (${employee.employee_id || "-"})`;
}

function setStoragePill(text) {
  storagePill.textContent = text;
}

function showLoginError(message) {
  loginError.hidden = false;
  loginError.textContent = message;
}

function hideLoginError() {
  loginError.hidden = true;
  loginError.textContent = "";
}

function showAppMessage(message) {
  if (!appMessage) {
    return;
  }

  appMessage.hidden = false;
  appMessage.textContent = message;
}

function hideAppMessage() {
  if (!appMessage) {
    return;
  }

  appMessage.hidden = true;
  appMessage.textContent = "";
}

function isCloudMode() {
  return state.authMode === "cloud" && state.storageMode === "cloud" && Boolean(supabaseClient);
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

function findEmployeeByCode(employeeCode) {
  const normalized = normalizeEmployeeCode(employeeCode);
  return state.employees.find((employee) => normalizeEmployeeCode(employee.employee_id) === normalized);
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

function cloneSeedData() {
  return structuredClone(seedData);
}

function createId(prefix) {
  if (window.crypto?.randomUUID) {
    return `${prefix}-${window.crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
