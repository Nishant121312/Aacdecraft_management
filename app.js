const CATEGORY_DEFINITIONS = [
  { key: "phones", label: "Phones", serialLabel: "IMEI / Serial" },
  { key: "sims", label: "SIMs", serialLabel: "SIM number" },
  { key: "laptops", label: "Laptops", serialLabel: "Serial number" },
  { key: "chargers", label: "Chargers", serialLabel: "Serial number" },
  { key: "desktops", label: "Desktops", serialLabel: "Serial number" },
  { key: "cpus", label: "CPUs", serialLabel: "Serial number" },
  { key: "monitors", label: "Monitors", serialLabel: "Serial number" },
  { key: "mouse", label: "Mouse", serialLabel: "Serial number" },
  { key: "keyboards", label: "Keyboards", serialLabel: "Serial number" },
  { key: "headphones", label: "Headphones", serialLabel: "Serial number" },
  { key: "ups", label: "UPS", serialLabel: "Serial number" }
];

const STORAGE_KEYS = {
  localSession: "asset-app-local-session-v3",
  localData: "asset-app-local-data-v3",
  cloudCache: "asset-app-cloud-cache-v1"
};

/** Only fetch from Supabase when cached dashboard data is older than this (stale-while-revalidate). */
const CACHE_MAX_AGE_MS = 5 * 60 * 1000;

const seedData = {
  employees: [
    {
      id: "emp-1",
      employee_id: "EMP-1001",
      name: "Rohit Verma",
      email: "rohit.verma@acadecraft.com",
      department: "Sales",
      notes: "Field operations"
    },
    {
      id: "emp-2",
      employee_id: "EMP-1002",
      name: "Neha Kapoor",
      email: "neha.kapoor@acadecraft.com",
      department: "Operations",
      notes: "Regional manager"
    },
    {
      id: "emp-3",
      employee_id: "EMP-1003",
      name: "Arjun Singh",
      email: "arjun.singh@acadecraft.com",
      department: "Support",
      notes: "Service desk"
    }
  ],
  assets: [
    { id: "ast-1", category: "phones", asset_name: "Samsung A54", serial_number: "356712341111111", status: "Assigned", assigned_employee_id: "emp-1", notes: "Sales coverage" },
    { id: "ast-2", category: "sims", asset_name: "Airtel SIM", serial_number: "899110120000000001", status: "Assigned", assigned_employee_id: "emp-1", notes: "+91 98111 22334" },
    { id: "ast-3", category: "phones", asset_name: "iPhone 13", serial_number: "356712342222222", status: "Assigned", assigned_employee_id: "emp-2", notes: "Regional manager device" },
    { id: "ast-4", category: "sims", asset_name: "Jio SIM", serial_number: "899110120000000002", status: "Available", assigned_employee_id: null, notes: "+91 98222 33445" },
    { id: "ast-5", category: "laptops", asset_name: "HP ProBook 440", serial_number: "LTP-HP-440-001", status: "Assigned", assigned_employee_id: "emp-2", notes: "Primary work laptop" },
    { id: "ast-6", category: "chargers", asset_name: "Dell 65W Charger", serial_number: "CHR-DL-065-001", status: "Available", assigned_employee_id: null, notes: "Spare charger" },
    { id: "ast-7", category: "desktops", asset_name: "Lenovo ThinkCentre", serial_number: "DST-LEN-001", status: "Available", assigned_employee_id: null, notes: "Back office" },
    { id: "ast-8", category: "cpus", asset_name: "Intel i7 CPU", serial_number: "CPU-I7-001", status: "Available", assigned_employee_id: null, notes: "Graphics team" },
    { id: "ast-9", category: "monitors", asset_name: "Dell 24 inch Monitor", serial_number: "MON-DEL-024", status: "Assigned", assigned_employee_id: "emp-3", notes: "Support desk monitor" },
    { id: "ast-10", category: "mouse", asset_name: "Logitech M185", serial_number: "MOU-LOG-185", status: "Assigned", assigned_employee_id: "emp-3", notes: "Wireless mouse" },
    { id: "ast-11", category: "keyboards", asset_name: "HP Wired Keyboard", serial_number: "KEY-HP-001", status: "Available", assigned_employee_id: null, notes: "Spare keyboard" },
    { id: "ast-12", category: "headphones", asset_name: "Jabra Headset", serial_number: "HDP-JBR-001", status: "Assigned", assigned_employee_id: "emp-3", notes: "Support calls" },
    { id: "ast-13", category: "ups", asset_name: "APC UPS 600VA", serial_number: "UPS-APC-600", status: "Available", assigned_employee_id: null, notes: "Conference room" }
  ],
  assignments: [
    { id: "asn-1", asset_id: "ast-1", employee_id: "emp-1", assigned_at: "2026-04-25T10:00:00.000Z", released_at: null, notes: "Sales coverage" },
    { id: "asn-2", asset_id: "ast-2", employee_id: "emp-1", assigned_at: "2026-04-25T10:05:00.000Z", released_at: null, notes: "Mobile data plan" },
    { id: "asn-3", asset_id: "ast-3", employee_id: "emp-2", assigned_at: "2026-04-26T09:30:00.000Z", released_at: null, notes: "Leadership device" },
    { id: "asn-4", asset_id: "ast-5", employee_id: "emp-2", assigned_at: "2026-04-26T09:40:00.000Z", released_at: null, notes: "Laptop allocation" },
    { id: "asn-5", asset_id: "ast-9", employee_id: "emp-3", assigned_at: "2026-04-27T08:45:00.000Z", released_at: null, notes: "Dual screen setup" },
    { id: "asn-6", asset_id: "ast-10", employee_id: "emp-3", assigned_at: "2026-04-27T08:48:00.000Z", released_at: null, notes: "Peripheral setup" },
    { id: "asn-7", asset_id: "ast-12", employee_id: "emp-3", assigned_at: "2026-04-20T11:15:00.000Z", released_at: null, notes: "Support headset" },
    { id: "asn-8", asset_id: "ast-4", employee_id: "emp-1", assigned_at: "2026-04-18T12:00:00.000Z", released_at: "2026-04-23T14:30:00.000Z", notes: "Temporary SIM assignment" }
  ]
};

const urlParams = new URLSearchParams(window.location.search);
const isDemoMode = urlParams.get("demo") === "true";

const state = {
  employees: [],
  assets: [],
  assignments: [],
  session: null,
  authMode: "logged-out",
  storageMode: "booting",
  configReady: false,
  refreshHandle: null,
  authSubscription: null,
  currentView: "overview",
  activeViewTab: "overview",
  selectedCategory: "phones",
  assetSearch: "",
  employeeSearch: "",
  employeeSearchRaw: "",
  employeesSearchSnapshot: null,
  assignmentEmployeeSearch: "",
  statusFilter: "all",
  isLoading: false
};

/** Singleton application state (same reference as `state`; useful after navigation / debugging). */
const globalState = state;

let cloudSnapshotAbortController = null;
let employeeSearchAbortController = null;
let employeeSearchDebounceTimer = null;
let lastRenderedViewName = null;

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
const loginError = document.getElementById("login-error");
const setupMessage = document.getElementById("setup-message");
const storagePill = document.getElementById("storage-pill");
const appMessage = document.getElementById("app-message");
const localSessionButton = document.getElementById("local-session-button");
const viewContainer = document.getElementById("view-container");
const toastRegion = document.getElementById("toast-region");

const employeeDialog = document.getElementById("employee-dialog");
const assetDialog = document.getElementById("asset-dialog");
const assignmentDialog = document.getElementById("assignment-dialog");
const employeeForm = document.getElementById("employee-form");
const assetForm = document.getElementById("asset-form");
const assignmentForm = document.getElementById("assignment-form");
const assetCategorySelect = document.getElementById("asset-category-select");
const assetSerialLabel = document.getElementById("asset-serial-label");
const assignmentEmployeeSelect = document.getElementById("assignment-employee-select");
const assignmentEmployeeCodeInput = document.getElementById("assignment-employee-code");
const assignmentEmployeeResult = document.getElementById("assignment-employee-result");
const assignmentSummary = document.getElementById("assignment-summary");

loginForm.addEventListener("submit", handleLogin);
logoutButton.addEventListener("click", handleLogout);
localSessionButton?.addEventListener("click", handleLocalSessionLogin);
employeeForm.addEventListener("submit", handleEmployeeSave);
assetForm.addEventListener("submit", handleAssetSave);
assignmentForm.addEventListener("submit", handleAssignmentSave);
document.body.addEventListener("click", handleBodyClick);
document.body.addEventListener("input", handleBodyInput);
document.body.addEventListener("change", handleBodyChange);
document.addEventListener("visibilitychange", handleVisibilityRefresh);

initialize().catch((error) => {
  console.error("Application bootstrap failed", error);
  if (setupMessage) {
    setupMessage.hidden = false;
    setupMessage.textContent = "Something went wrong starting the app. Please refresh the page.";
  }
});

async function initialize() {
  try {
    state.configReady = Boolean(supabaseClient);
    populateCategorySelect();
    setLoggedOutMessage();

    if (isDemoMode) {
      startLocalSession("demo@asset.local", "Storage: Local demo session", "Demo mode is using the bundled multi-asset sample data in this browser.");
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
  } catch (error) {
    console.error("initialize failed", error);
    setLoggedOutMessage();
    syncAuthView();
  }
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
  const email = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "").trim();

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
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

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
  clearCloudCache();
  abortCloudSnapshotFetch();

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
  state.session = { mode: "local", user: { email } };
  state.authMode = "local";
  state.storageMode = "local";
  writeStoredLocalSession({ email });
  hydrateLocalData();
  setStoragePill(pillText);
  showAppMessage(messageText);
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
  const nextData = normalizeData(stored || structuredClone(seedData));
  state.employees = nextData.employees;
  state.assets = nextData.assets;
  state.assignments = nextData.assignments;
  persistLocalData();
}

function abortCloudSnapshotFetch() {
  if (cloudSnapshotAbortController) {
    cloudSnapshotAbortController.abort();
    cloudSnapshotAbortController = null;
  }
}

function readCloudCache() {
  try {
    const rawValue = localStorage.getItem(STORAGE_KEYS.cloudCache);
    if (!rawValue) {
      return null;
    }
    const parsed = JSON.parse(rawValue);
    if (!parsed || typeof parsed.ts !== "number") {
      return null;
    }
    return parsed;
  } catch (error) {
    console.warn("readCloudCache failed", error);
    return null;
  }
}

function writeCloudCache(rows) {
  try {
    localStorage.setItem(STORAGE_KEYS.cloudCache, JSON.stringify({
      ts: Date.now(),
      employees: rows.employees,
      assets: rows.assets,
      assignments: rows.assignments
    }));
  } catch (error) {
    console.warn("writeCloudCache failed", error);
  }
}

function clearCloudCache() {
  try {
    localStorage.removeItem(STORAGE_KEYS.cloudCache);
  } catch (error) {
    console.warn("clearCloudCache failed", error);
  }
}

function fingerprintDataset(employees, assets, assignments) {
  const stable = (rows) => [...rows].sort((left, right) => String(left.id).localeCompare(String(right.id)));
  return JSON.stringify({
    employees: stable(employees),
    assets: stable(assets),
    assignments: stable(assignments)
  });
}

function applyCloudRows(employees, assets, assignments, pillLabel, messageText) {
  const prevFingerprint = fingerprintDataset(state.employees, state.assets, state.assignments);
  state.storageMode = "cloud";
  state.employees = normalizeEmployees(employees);
  state.assets = normalizeAssets(assets);
  state.assignments = normalizeAssignments(assignments);
  const nextFingerprint = fingerprintDataset(state.employees, state.assets, state.assignments);
  setStoragePill(pillLabel);
  if (messageText) {
    showAppMessage(messageText);
  }
  if (prevFingerprint !== nextFingerprint) {
    renderApp();
  }
}

function withAbortSignal(query, signal) {
  if (!signal || !query || typeof query.abortSignal !== "function") {
    return query;
  }

  return query.abortSignal(signal);
}

async function fetchCloudDataset(signal, options = {}) {
  const [employeesResult, assetsResult, assignmentsResult] = await Promise.all([
    withAbortSignal(supabaseClient.from("employees").select("*").order("created_at", { ascending: false }), signal),
    withAbortSignal(supabaseClient.from("assets").select("*").order("created_at", { ascending: false }), signal),
    withAbortSignal(supabaseClient.from("assignments").select("*").order("assigned_at", { ascending: false }), signal)
  ]);

  const firstError = employeesResult.error || assetsResult.error || assignmentsResult.error;
  if (firstError) {
    return { ok: false, error: firstError };
  }

  const employees = employeesResult.data ?? [];
  const assets = assetsResult.data ?? [];
  const assignments = assignmentsResult.data ?? [];
  const isEmpty = employees.length === 0 && assets.length === 0 && assignments.length === 0;

  if (isEmpty && options.seedIfEmpty) {
    const seeded = await initializeDatabaseWithSeedData();
    if (seeded) {
      return fetchCloudDataset(signal, { ...options, seedIfEmpty: false });
    }
  }

  if (isEmpty) {
    return { ok: false, empty: true };
  }

  return { ok: true, employees, assets, assignments };
}

async function loadCloudData(options = {}) {
  if (!supabaseClient || !state.session) {
    return false;
  }

  hideLoginError();

  const cached = readCloudCache();
  const cacheAgeMs = cached?.ts ? Date.now() - cached.ts : Infinity;
  const hasValidCache = Boolean(
    cached
      && Array.isArray(cached.employees)
      && Array.isArray(cached.assets)
      && Array.isArray(cached.assignments)
  );

  const cacheHydrateAllowed = state.storageMode !== "local-fallback" && options.allowCacheHydrate !== false;

  if (hasValidCache && cacheHydrateAllowed) {
    try {
      applyCloudRows(
        cached.employees,
        cached.assets,
        cached.assignments,
        cacheAgeMs < CACHE_MAX_AGE_MS ? "Storage: Supabase cloud (cached)" : "Storage: Supabase cloud",
        cacheAgeMs < CACHE_MAX_AGE_MS ? "" : ""
      );
      if (cacheAgeMs < CACHE_MAX_AGE_MS) {
        showAppMessage("Showing cached dashboard data.");
      }
    } catch (error) {
      console.error("Hydrating cloud cache failed", error);
    }

    setLoading(false);

    if (cacheAgeMs < CACHE_MAX_AGE_MS) {
      return true;
    }

    showAppMessage("Refreshing dashboard in the background...");
    void revalidateCloudDataset(options);
    return true;
  }

  setLoading(true, "Loading assets, employees, and assignments...");
  abortCloudSnapshotFetch();
  cloudSnapshotAbortController = new AbortController();
  const signal = cloudSnapshotAbortController.signal;

  try {
    const result = await fetchCloudDataset(signal, options);

    if (!result.ok && result.error) {
      showAppMessage(`Cloud data is unavailable right now: ${result.error.message}. Falling back to local browser data.`);
      startCloudFallback();
      return false;
    }

    if (!result.ok && result.empty) {
      showAppMessage("Cloud tables are still empty, so the dashboard is using local sample data for now.");
      startCloudFallback();
      return false;
    }

    writeCloudCache({
      employees: result.employees,
      assets: result.assets,
      assignments: result.assignments
    });

    applyCloudRows(
      result.employees,
      result.assets,
      result.assignments,
      "Storage: Supabase cloud",
      "Connected to Supabase cloud data."
    );
    return true;
  } catch (error) {
    if (error?.name === "AbortError") {
      return false;
    }
    console.error("Cloud data load failed", error);
    showAppMessage("Cloud data could not be loaded, so the app switched to local browser data.");
    startCloudFallback();
    return false;
  } finally {
    cloudSnapshotAbortController = null;
    setLoading(false);
  }
}

async function revalidateCloudDataset(options = {}) {
  if (!supabaseClient || !state.session) {
    return;
  }

  abortCloudSnapshotFetch();
  cloudSnapshotAbortController = new AbortController();
  const signal = cloudSnapshotAbortController.signal;

  try {
    const result = await fetchCloudDataset(signal, { ...options, seedIfEmpty: false });

    if (!result.ok) {
      return;
    }

    writeCloudCache({
      employees: result.employees,
      assets: result.assets,
      assignments: result.assignments
    });

    const prevFingerprint = fingerprintDataset(state.employees, state.assets, state.assignments);
    const nextEmployees = normalizeEmployees(result.employees);
    const nextAssets = normalizeAssets(result.assets);
    const nextAssignments = normalizeAssignments(result.assignments);
    const nextFingerprint = fingerprintDataset(nextEmployees, nextAssets, nextAssignments);

    if (prevFingerprint !== nextFingerprint) {
      state.employees = nextEmployees;
      state.assets = nextAssets;
      state.assignments = nextAssignments;
      setStoragePill("Storage: Supabase cloud");
      showAppMessage("Dashboard updated from Supabase.");
      renderApp();
    }
  } catch (error) {
    if (error?.name !== "AbortError") {
      console.warn("Background cloud refresh failed", error);
    }
  } finally {
    cloudSnapshotAbortController = null;
  }
}

function startCloudFallback() {
  state.storageMode = "local-fallback";
  hydrateLocalData();
  setStoragePill("Storage: Local browser fallback");
  renderApp();
  setLoading(false);
}

async function initializeDatabaseWithSeedData() {
  if (!supabaseClient) {
    return false;
  }

  try {
    const { data: existingAssets, error: assetsCheckError } = await supabaseClient
      .from("assets")
      .select("id")
      .limit(1);

    if (assetsCheckError) {
      return false;
    }

    if ((existingAssets ?? []).length > 0) {
      return true;
    }

    const employeeRows = seedData.employees.map((employee) => ({
      name: employee.name,
      employee_id: employee.employee_id,
      email: employee.email,
      department: employee.department,
      notes: employee.notes
    }));

    const { data: insertedEmployees, error: employeeError } = await supabaseClient
      .from("employees")
      .insert(employeeRows)
      .select("id, employee_id");

    if (employeeError || !insertedEmployees) {
      return false;
    }

    const employeeIdMap = new Map();
    insertedEmployees.forEach((employee) => {
      employeeIdMap.set(employee.employee_id, employee.id);
    });

    const assetRows = seedData.assets.map((asset) => {
      const seedEmployee = seedData.employees.find((employee) => employee.id === asset.assigned_employee_id);
      return {
        category: asset.category,
        asset_name: asset.asset_name,
        serial_number: asset.serial_number,
        status: asset.status,
        assigned_employee_id: seedEmployee ? employeeIdMap.get(seedEmployee.employee_id) : null,
        notes: asset.notes
      };
    });

    const { data: insertedAssets, error: assetError } = await supabaseClient
      .from("assets")
      .insert(assetRows)
      .select("id, serial_number");

    if (assetError || !insertedAssets) {
      return false;
    }

    const assetIdMap = new Map();
    insertedAssets.forEach((asset) => {
      assetIdMap.set(asset.serial_number, asset.id);
    });

    const assignmentRows = seedData.assignments.map((assignment) => {
      const seedAsset = seedData.assets.find((asset) => asset.id === assignment.asset_id);
      const seedEmployee = seedData.employees.find((employee) => employee.id === assignment.employee_id);
      return {
        asset_id: seedAsset ? assetIdMap.get(seedAsset.serial_number) : null,
        employee_id: seedEmployee ? employeeIdMap.get(seedEmployee.employee_id) : null,
        assigned_at: assignment.assigned_at,
        released_at: assignment.released_at,
        notes: assignment.notes
      };
    }).filter((assignment) => assignment.asset_id && assignment.employee_id);

    const { error: assignmentError } = await supabaseClient
      .from("assignments")
      .insert(assignmentRows);

    return !assignmentError;
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

function handleBodyClick(event) {
  const viewTrigger = event.target.closest("[data-view]");
  if (viewTrigger) {
    state.currentView = viewTrigger.getAttribute("data-view");
    state.activeViewTab = state.currentView;
    renderApp();
    return;
  }

  const categoryTrigger = event.target.closest("[data-category]");
  if (categoryTrigger) {
    state.selectedCategory = categoryTrigger.getAttribute("data-category");
    state.currentView = "category";
    renderApp();
    return;
  }

  const openEmployeeTrigger = event.target.closest("[data-open-employee]");
  if (openEmployeeTrigger) {
    openEmployeeDialog();
    return;
  }

  const editEmployeeTrigger = event.target.closest("[data-edit-employee]");
  if (editEmployeeTrigger) {
    openEmployeeDialog(editEmployeeTrigger.getAttribute("data-edit-employee"));
    return;
  }

  const openAssetTrigger = event.target.closest("[data-open-asset]");
  if (openAssetTrigger) {
    openAssetDialog("", openAssetTrigger.getAttribute("data-open-asset") || state.selectedCategory);
    return;
  }

  const editAssetTrigger = event.target.closest("[data-edit-asset]");
  if (editAssetTrigger) {
    openAssetDialog(editAssetTrigger.getAttribute("data-edit-asset"));
    return;
  }

  const assignAssetTrigger = event.target.closest("[data-assign-asset]");
  if (assignAssetTrigger) {
    openAssignmentDialog(assignAssetTrigger.getAttribute("data-assign-asset"));
    return;
  }

  const releaseAssetTrigger = event.target.closest("[data-release-asset]");
  if (releaseAssetTrigger) {
    releaseAsset(releaseAssetTrigger.getAttribute("data-release-asset"));
    return;
  }

  const closeDialogTrigger = event.target.closest("[data-close-dialog]");
  if (closeDialogTrigger) {
    closeDialog(closeDialogTrigger.getAttribute("data-close-dialog"));
  }
}

function handleBodyInput(event) {
  const target = event.target;

  if (target.id === "asset-search-input") {
    state.assetSearch = target.value.trim();
    updateCategorySearchResults();
    return;
  }

  if (target.id === "employee-search-input") {
    state.employeeSearchRaw = target.value;
    state.employeeSearch = normalizeEmployeeCode(target.value);
    if (isCloudMode()) {
      state.employeesSearchSnapshot = null;
    }
    updateEmployeeSearchResults();
    if (isCloudMode()) {
      scheduleDebouncedEmployeeSearch();
    }
    return;
  }

  if (target.id === "assignment-employee-code") {
    state.assignmentEmployeeSearch = normalizeEmployeeCode(target.value);
    syncAssignmentEmployeeSelection();
    return;
  }

  if (target.name === "category") {
    syncAssetSerialLabel(target.value);
  }
}

function handleBodyChange(event) {
  const target = event.target;

  if (target.id === "asset-status-filter") {
    state.statusFilter = target.value;
    updateCategorySearchResults();
  }
}

function renderApp() {
  try {
    renderStats();
  } catch (error) {
    console.error("renderStats failed", error);
  }

  try {
    renderNavigation();
  } catch (error) {
    console.error("renderNavigation failed", error);
  }

  try {
    renderCurrentView();
  } catch (error) {
    console.error("renderCurrentView failed", error);
  }
}

function renderStats() {
  const totals = getDashboardTotals();
  document.getElementById("total-assets").textContent = String(totals.totalAssets);
  document.getElementById("assigned-assets").textContent = String(totals.assignedAssets);
  document.getElementById("available-assets").textContent = String(totals.availableAssets);
  document.getElementById("total-employees").textContent = String(totals.totalEmployees);
}

function renderNavigation() {
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.classList.toggle("active", button.getAttribute("data-view") === state.activeViewTab);
  });

  document.querySelectorAll("[data-category]").forEach((button) => {
    button.classList.toggle("active", button.getAttribute("data-category") === state.selectedCategory && state.currentView === "category");
  });
}

function cleanupBeforeViewRender() {
  const previousView = lastRenderedViewName;
  const nextView = state.currentView;

  if (previousView === "employees" && nextView !== "employees") {
    if (employeeSearchAbortController) {
      employeeSearchAbortController.abort();
      employeeSearchAbortController = null;
    }
    if (employeeSearchDebounceTimer !== null) {
      clearTimeout(employeeSearchDebounceTimer);
      employeeSearchDebounceTimer = null;
    }
    state.employeesSearchSnapshot = null;
  }

  lastRenderedViewName = nextView;
}

function updateCategorySearchResults() {
  try {
    const panel = document.getElementById("category-search-result-panel");
    const tbody = document.getElementById("category-table-body");
    if (panel) {
      panel.innerHTML = renderCategorySearchResult();
    }
    if (tbody) {
      tbody.innerHTML = renderCategoryTableRows();
    }
  } catch (error) {
    console.error("updateCategorySearchResults failed", error);
  }
}

function updateEmployeeSearchResults() {
  try {
    const panel = document.getElementById("employee-search-result-panel");
    const tbody = document.getElementById("employee-table-body");
    if (panel) {
      panel.innerHTML = renderEmployeeSearchResult();
    }
    if (tbody) {
      tbody.innerHTML = renderEmployeeTableRows();
    }
  } catch (error) {
    console.error("updateEmployeeSearchResults failed", error);
  }
}

function escapeLikePattern(value) {
  return String(value || "").replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

function scheduleDebouncedEmployeeSearch() {
  if (employeeSearchDebounceTimer !== null) {
    clearTimeout(employeeSearchDebounceTimer);
  }

  employeeSearchDebounceTimer = window.setTimeout(() => {
    employeeSearchDebounceTimer = null;
    void runDebouncedEmployeeSearch();
  }, 300);
}

async function runDebouncedEmployeeSearch() {
  if (state.currentView !== "employees" || !isCloudMode()) {
    return;
  }

  const rawQuery = state.employeeSearchRaw.trim();
  if (!rawQuery) {
    state.employeesSearchSnapshot = null;
    updateEmployeeSearchResults();
    return;
  }

  if (employeeSearchAbortController) {
    employeeSearchAbortController.abort();
  }

  employeeSearchAbortController = new AbortController();
  const controller = employeeSearchAbortController;
  const signal = controller.signal;

  try {
    const escaped = escapeLikePattern(rawQuery);
    const pattern = `%${escaped}%`;
    const orClause = `name.ilike.${pattern},employee_id.ilike.${pattern},email.ilike.${pattern},department.ilike.${pattern}`;
    const employeeSearchQuery = supabaseClient.from("employees").select("*").or(orClause);
    const { data, error } = await withAbortSignal(employeeSearchQuery, signal);

    if (error) {
      throw error;
    }

    state.employeesSearchSnapshot = normalizeEmployees(data ?? []);
    updateEmployeeSearchResults();
  } catch (error) {
    if (error?.name === "AbortError") {
      return;
    }
    console.warn("Employee search request failed", error);
    state.employeesSearchSnapshot = null;
    updateEmployeeSearchResults();
  } finally {
    if (employeeSearchAbortController === controller) {
      employeeSearchAbortController = null;
    }
  }
}

function renderCurrentView() {
  cleanupBeforeViewRender();

  try {
    if (state.isLoading) {
      viewContainer.innerHTML = '<div class="loading-state">Loading dashboard data...</div>';
      return;
    }

    if (state.currentView === "employees") {
      viewContainer.innerHTML = renderEmployeesView();
      return;
    }

    if (state.currentView === "history") {
      viewContainer.innerHTML = renderHistoryView();
      return;
    }

    if (state.currentView === "category") {
      viewContainer.innerHTML = renderCategoryView();
      return;
    }

    viewContainer.innerHTML = renderOverviewView();
  } catch (error) {
    console.error("renderCurrentView failed", error);
    viewContainer.innerHTML = '<div class="loading-state error-text">This view failed to render. Try another tab or refresh the page.</div>';
  }
}

function renderOverviewView() {
  const categoryCards = CATEGORY_DEFINITIONS.map((category) => {
    const assets = getAssetsByCategory(category.key);
    const assigned = assets.filter((asset) => asset.status === "Assigned").length;
    return `
      <button type="button" class="category-summary-card" data-category="${category.key}">
        <span class="eyebrow">${escapeHtml(category.label)}</span>
        <strong>${assets.length}</strong>
        <span class="muted-line">${assigned} assigned</span>
      </button>
    `;
  }).join("");

  const recentRows = getRecentAssignments(6).map((assignment) => renderAssignmentRow(assignment)).join("");

  return `
    <div class="dashboard-band">
      <div class="section-header">
        <div>
          <p class="eyebrow">Summary</p>
          <h2>Assets by category</h2>
        </div>
      </div>
      <div class="category-summary-grid">${categoryCards}</div>
    </div>

    <div class="dashboard-band">
      <div class="section-header">
        <div>
          <p class="eyebrow">Recent activity</p>
          <h2>Recent assignments</h2>
        </div>
        <button type="button" class="secondary-button" data-view="history">View full history</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Asset</th>
              <th>Category</th>
              <th>Employee</th>
              <th>Assigned</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>${recentRows || createEmptyRowMarkup(5, "No assignments yet")}</tbody>
        </table>
      </div>
    </div>
  `;
}

function renderEmployeesView() {
  return `
    <div class="dashboard-band">
      <div class="section-header">
        <div>
          <p class="eyebrow">Employees</p>
          <h2>Create and manage employees</h2>
        </div>
        <button type="button" class="secondary-button" data-open-employee>Create employee</button>
      </div>
      <div class="search-panel">
        <label class="toolbar-field search-label">
          Search employees
          <input id="employee-search-input" type="search" placeholder="Name, Employee ID, email, or department" value="${escapeHtml(state.employeeSearchRaw)}" autocomplete="off">
        </label>
        <div id="employee-search-result-panel">${renderEmployeeSearchResult()}</div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Employee ID</th>
              <th>Department</th>
              <th>Assigned assets</th>
              <th>Asset list</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="employee-table-body">${renderEmployeeTableRows()}</tbody>
        </table>
      </div>
    </div>
  `;
}

function renderHistoryView() {
  const rows = getRecentAssignments(100).map((assignment) => renderAssignmentRow(assignment)).join("");

  return `
    <div class="dashboard-band">
      <div class="section-header">
        <div>
          <p class="eyebrow">History</p>
          <h2>Assignment history</h2>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Asset</th>
              <th>Category</th>
              <th>Employee</th>
              <th>Assigned</th>
              <th>Released</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>${rows || createEmptyRowMarkup(6, "No assignment history yet")}</tbody>
        </table>
      </div>
    </div>
  `;
}

function renderCategoryView() {
  const category = getCategoryDefinition(state.selectedCategory);
  return `
    <div class="dashboard-band">
      <div class="section-header">
        <div>
          <p class="eyebrow">Category view</p>
          <h2>${escapeHtml(category.label)}</h2>
        </div>
        <button type="button" class="secondary-button" data-open-asset="${category.key}">Add asset</button>
      </div>

      <div class="toolbar-row">
        <label class="toolbar-field">
          Search
          <input id="asset-search-input" type="search" placeholder="Search asset, serial, or Employee ID" value="${escapeHtml(state.assetSearch)}">
        </label>
        <label class="toolbar-field small">
          Status
          <select id="asset-status-filter">
            <option value="all"${state.statusFilter === "all" ? " selected" : ""}>All</option>
            <option value="available"${state.statusFilter === "available" ? " selected" : ""}>Available</option>
            <option value="assigned"${state.statusFilter === "assigned" ? " selected" : ""}>Assigned</option>
          </select>
        </label>
      </div>

      <div id="category-search-result-panel" class="search-result">${renderCategorySearchResult()}</div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Asset name</th>
              <th>${escapeHtml(category.serialLabel)}</th>
              <th>Status</th>
              <th>Assigned employee</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="category-table-body">${renderCategoryTableRows()}</tbody>
        </table>
      </div>
    </div>
  `;
}

function renderAssignmentRow(assignment) {
  const asset = findAsset(assignment.asset_id);
  const employee = findEmployee(assignment.employee_id);
  const category = asset ? getCategoryDefinition(asset.category).label : "-";
  const statusText = assignment.released_at ? "Released" : "Active";

  return `
    <tr>
      <td>${escapeHtml(asset?.asset_name || "Unknown asset")}</td>
      <td>${escapeHtml(category)}</td>
      <td>${escapeHtml(employee ? formatEmployeeLabel(employee) : "Unknown employee")}</td>
      <td>${escapeHtml(formatDateTime(assignment.assigned_at))}</td>
      ${state.currentView === "history" ? `<td>${escapeHtml(assignment.released_at ? formatDateTime(assignment.released_at) : "-")}</td>` : ""}
      <td>${statusText === "Active" ? renderStatusBadge(true) : '<span class="status-badge available">Released</span>'}</td>
    </tr>
  `;
}

function openEmployeeDialog(employeeId = "") {
  employeeForm.reset();
  employeeForm.elements.employeeId.value = employeeId;
  document.getElementById("employee-dialog-title").textContent = employeeId ? "Edit employee" : "Create employee";

  const employee = findEmployee(employeeId);
  if (employee) {
    employeeForm.elements.name.value = employee.name;
    employeeForm.elements.employeeCode.value = employee.employee_id;
    employeeForm.elements.email.value = employee.email || "";
    employeeForm.elements.department.value = employee.department || "";
    employeeForm.elements.notes.value = employee.notes || "";
  }

  employeeDialog.showModal();
}

function openAssetDialog(assetId = "", categoryKey = state.selectedCategory) {
  assetForm.reset();
  assetForm.elements.assetId.value = assetId;
  const asset = findAsset(assetId);
  const selectedCategory = asset?.category || categoryKey;

  assetCategorySelect.value = selectedCategory;
  syncAssetSerialLabel(selectedCategory);
  document.getElementById("asset-dialog-title").textContent = assetId ? "Edit asset" : "Add asset";

  if (asset) {
    assetForm.elements.assetName.value = asset.asset_name;
    assetForm.elements.serialNumber.value = asset.serial_number;
    assetForm.elements.notes.value = asset.notes || "";
  }

  assetDialog.showModal();
}

async function handleEmployeeSave(event) {
  event.preventDefault();
  const formData = new FormData(employeeForm);
  const employeeId = String(formData.get("employeeId") || "").trim();
  const payload = {
    id: employeeId || createId("emp"),
    name: String(formData.get("name") || "").trim(),
    employee_id: normalizeEmployeeCode(formData.get("employeeCode")),
    email: String(formData.get("email") || "").trim(),
    department: String(formData.get("department") || "").trim(),
    notes: String(formData.get("notes") || "").trim()
  };

  if (!payload.name || !payload.employee_id) {
    toast("Employee name and Employee ID are required.", "error");
    return;
  }

  const duplicate = state.employees.find((employee) => employee.employee_id === payload.employee_id && employee.id !== payload.id);
  if (duplicate) {
    toast("Employee ID must be unique.", "error");
    return;
  }

  if (isCloudMode()) {
    const cloudPayload = {
      name: payload.name,
      employee_id: payload.employee_id,
      email: payload.email,
      department: payload.department,
      notes: payload.notes
    };
    const query = employeeId
      ? supabaseClient.from("employees").update(cloudPayload).eq("id", employeeId)
      : supabaseClient.from("employees").insert(cloudPayload);
    const { error } = await query;
    if (error) {
      toast(error.message, "error");
      return;
    }
    await loadCloudData({ seedIfEmpty: false });
  } else {
    saveEmployeeLocally(payload);
  }

  closeDialog("employee-dialog");
  toast("Employee saved.", "success");
}

async function handleAssetSave(event) {
  event.preventDefault();
  const formData = new FormData(assetForm);
  const assetId = String(formData.get("assetId") || "").trim();
  const existing = assetId ? findAsset(assetId) : null;
  const payload = {
    id: assetId || createId("ast"),
    category: String(formData.get("category") || "").trim(),
    asset_name: String(formData.get("assetName") || "").trim(),
    serial_number: String(formData.get("serialNumber") || "").trim(),
    status: existing?.status || "Available",
    assigned_employee_id: existing?.assigned_employee_id || null,
    notes: String(formData.get("notes") || "").trim()
  };

  if (!payload.asset_name || !payload.serial_number || !payload.category) {
    toast("Asset name, category, and serial are required.", "error");
    return;
  }

  const duplicate = state.assets.find((asset) => asset.serial_number === payload.serial_number && asset.id !== payload.id);
  if (duplicate) {
    toast("Serial / IMEI must be unique.", "error");
    return;
  }

  if (isCloudMode()) {
    const cloudPayload = {
      category: payload.category,
      asset_name: payload.asset_name,
      serial_number: payload.serial_number,
      status: payload.status,
      assigned_employee_id: payload.assigned_employee_id,
      notes: payload.notes
    };

    const query = assetId
      ? supabaseClient.from("assets").update(cloudPayload).eq("id", assetId)
      : supabaseClient.from("assets").insert(cloudPayload);
    const { error } = await query;
    if (error) {
      toast(error.message, "error");
      return;
    }
    await loadCloudData({ seedIfEmpty: false });
  } else {
    saveAssetLocally(payload);
  }

  closeDialog("asset-dialog");
  toast("Asset saved.", "success");
}

async function handleAssignmentSave(event) {
  event.preventDefault();
  const formData = new FormData(assignmentForm);
  const assetId = String(formData.get("assetId") || "").trim();
  const employeeId = String(formData.get("employeeId") || "").trim();
  const note = String(formData.get("assignmentNote") || "").trim();
  const now = new Date().toISOString();

  if (!assetId || !employeeId) {
    toast("Choose an employee to assign this asset.", "error");
    return;
  }

  if (isCloudMode()) {
    await releaseAssetCloud(assetId, false);
    const { error: assignmentError } = await supabaseClient.from("assignments").insert({
      asset_id: assetId,
      employee_id: employeeId,
      assigned_at: now,
      released_at: null,
      notes: note
    });

    if (assignmentError) {
      toast(assignmentError.message, "error");
      return;
    }

    const { error: assetError } = await supabaseClient
      .from("assets")
      .update({ status: "Assigned", assigned_employee_id: employeeId })
      .eq("id", assetId);

    if (assetError) {
      toast(assetError.message, "error");
      return;
    }

    await loadCloudData({ seedIfEmpty: false });
  } else {
    assignAssetLocally(assetId, employeeId, note, now);
  }

  closeDialog("assignment-dialog");
  toast("Asset assigned.", "success");
}

async function releaseAsset(assetId) {
  if (isCloudMode()) {
    await releaseAssetCloud(assetId, true);
    return;
  }

  releaseAssetLocally(assetId);
  toast("Asset released.", "success");
}

async function releaseAssetCloud(assetId, notifyUser) {
  const activeAssignment = findActiveAssignmentByAsset(assetId);
  if (activeAssignment) {
    const { error: assignmentError } = await supabaseClient
      .from("assignments")
      .update({ released_at: new Date().toISOString() })
      .eq("id", activeAssignment.id);

    if (assignmentError) {
      toast(assignmentError.message, "error");
      return;
    }
  }

  const { error: assetError } = await supabaseClient
    .from("assets")
    .update({ status: "Available", assigned_employee_id: null })
    .eq("id", assetId);

  if (assetError) {
    toast(assetError.message, "error");
    return;
  }

  await loadCloudData({ seedIfEmpty: false });
  if (notifyUser) {
    toast("Asset released.", "success");
  }
}

function saveEmployeeLocally(payload) {
  const existingIndex = state.employees.findIndex((employee) => employee.id === payload.id);
  if (existingIndex >= 0) {
    state.employees[existingIndex] = { ...state.employees[existingIndex], ...payload };
  } else {
    state.employees.unshift(payload);
  }
  persistLocalData();
  renderApp();
}

function saveAssetLocally(payload) {
  const existingIndex = state.assets.findIndex((asset) => asset.id === payload.id);
  if (existingIndex >= 0) {
    state.assets[existingIndex] = { ...state.assets[existingIndex], ...payload };
  } else {
    state.assets.unshift(payload);
  }
  persistLocalData();
  renderApp();
}

function assignAssetLocally(assetId, employeeId, note, timestamp) {
  const asset = findAsset(assetId);
  if (!asset) {
    return;
  }

  releaseAssetLocally(assetId, false);
  state.assignments.unshift({
    id: createId("asn"),
    asset_id: assetId,
    employee_id: employeeId,
    assigned_at: timestamp,
    released_at: null,
    notes: note
  });
  asset.status = "Assigned";
  asset.assigned_employee_id = employeeId;
  persistLocalData();
  renderApp();
}

function releaseAssetLocally(assetId, notifyUser = true) {
  const asset = findAsset(assetId);
  if (!asset) {
    return;
  }

  const activeAssignment = findActiveAssignmentByAsset(assetId);
  if (activeAssignment) {
    activeAssignment.released_at = new Date().toISOString();
  }

  asset.status = "Available";
  asset.assigned_employee_id = null;
  persistLocalData();
  renderApp();

  if (notifyUser) {
    toast("Asset released.", "success");
  }
}

function persistLocalData() {
  try {
    sessionStorage.setItem(STORAGE_KEYS.localData, JSON.stringify({
      employees: state.employees,
      assets: state.assets,
      assignments: state.assignments
    }));
  } catch (error) {
    console.error("Failed to persist local data", error);
  }
}

function readStoredLocalData() {
  try {
    const rawValue = sessionStorage.getItem(STORAGE_KEYS.localData);
    return rawValue ? JSON.parse(rawValue) : null;
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
  abortCloudSnapshotFetch();
  if (employeeSearchAbortController) {
    employeeSearchAbortController.abort();
    employeeSearchAbortController = null;
  }
  if (employeeSearchDebounceTimer !== null) {
    clearTimeout(employeeSearchDebounceTimer);
    employeeSearchDebounceTimer = null;
  }

  state.employees = [];
  state.assets = [];
  state.assignments = [];
  state.employeeSearch = "";
  state.employeeSearchRaw = "";
  state.employeesSearchSnapshot = null;
  clearCloudCache();
  renderApp();
}

function normalizeData(rawData) {
  if (!rawData || !Array.isArray(rawData.employees) || !Array.isArray(rawData.assets) || !Array.isArray(rawData.assignments)) {
    return structuredClone(seedData);
  }

  return {
    employees: normalizeEmployees(rawData.employees),
    assets: normalizeAssets(rawData.assets),
    assignments: normalizeAssignments(rawData.assignments)
  };
}

function normalizeEmployees(employees) {
  return employees.map((employee, index) => ({
    id: employee.id || createId("emp"),
    name: employee.name || "Unnamed employee",
    employee_id: normalizeEmployeeCode(employee.employee_id || `EMP-${String(index + 1001).padStart(4, "0")}`),
    email: employee.email || "",
    department: employee.department || "",
    notes: employee.notes || ""
  }));
}

function normalizeAssets(assets) {
  return assets.map((asset) => ({
    id: asset.id || createId("ast"),
    category: normalizeCategoryKey(asset.category, asset.asset_name, asset.notes),
    asset_name: asset.asset_name || "Unnamed asset",
    serial_number: asset.serial_number || "",
    status: asset.status === "Assigned" ? "Assigned" : "Available",
    assigned_employee_id: asset.assigned_employee_id || null,
    notes: asset.notes || ""
  }));
}

function normalizeAssignments(assignments) {
  return assignments.map((assignment) => ({
    id: assignment.id || createId("asn"),
    asset_id: assignment.asset_id,
    employee_id: assignment.employee_id,
    assigned_at: assignment.assigned_at || new Date().toISOString(),
    released_at: assignment.released_at || null,
    notes: assignment.notes || ""
  })).sort((left, right) => new Date(right.assigned_at) - new Date(left.assigned_at));
}

function getDashboardTotals() {
  const assignedAssets = state.assets.filter((asset) => asset.status === "Assigned").length;
  return {
    totalAssets: state.assets.length,
    assignedAssets,
    availableAssets: state.assets.length - assignedAssets,
    totalEmployees: state.employees.length
  };
}

function getAssetsByCategory(categoryKey) {
  return state.assets.filter((asset) => asset.category === categoryKey);
}

function getFilteredCategoryAssets(categoryKey) {
  const query = state.assetSearch.toLowerCase();
  return getAssetsByCategory(categoryKey).filter((asset) => {
    const employee = findEmployee(asset.assigned_employee_id);
    const employeeLabel = employee ? formatEmployeeLabel(employee).toLowerCase() : "";
    const matchesQuery = !query
      || asset.asset_name.toLowerCase().includes(query)
      || asset.serial_number.toLowerCase().includes(query)
      || employeeLabel.includes(query);

    const matchesStatus = state.statusFilter === "all"
      || (state.statusFilter === "available" && asset.status === "Available")
      || (state.statusFilter === "assigned" && asset.status === "Assigned");

    return matchesQuery && matchesStatus;
  });
}

function getEmployeeAssets(employeeId) {
  return state.assets.filter((asset) => asset.assigned_employee_id === employeeId);
}

function getRecentAssignments(limit) {
  return [...state.assignments]
    .sort((left, right) => new Date(right.assigned_at) - new Date(left.assigned_at))
    .slice(0, limit);
}

function findEmployee(employeeId) {
  return state.employees.find((employee) => employee.id === employeeId);
}

function findAsset(assetId) {
  return state.assets.find((asset) => asset.id === assetId);
}

function findActiveAssignmentByAsset(assetId) {
  return state.assignments.find((assignment) => assignment.asset_id === assetId && !assignment.released_at);
}

function getCategoryDefinition(categoryKey) {
  return CATEGORY_DEFINITIONS.find((category) => category.key === categoryKey) || CATEGORY_DEFINITIONS[0];
}

function normalizeCategoryKey(categoryKey, assetName = "", notes = "") {
  const normalizedKey = String(categoryKey || "").trim().toLowerCase();
  const assetText = `${assetName} ${notes}`.toLowerCase();

  if (normalizedKey === "phones-sims") {
    return /\bsim\b/.test(assetText) ? "sims" : "phones";
  }

  if (normalizedKey === "laptops-chargers") {
    return /\bcharger\b|\b65w\b|\badapter\b|\bpower\b/.test(assetText) ? "chargers" : "laptops";
  }

  if (CATEGORY_DEFINITIONS.some((category) => category.key === normalizedKey)) {
    return normalizedKey;
  }

  return "phones";
}

function populateCategorySelect() {
  try {
    assetCategorySelect.innerHTML = CATEGORY_DEFINITIONS.map((category) => `
      <option value="${category.key}">${escapeHtml(category.label)}</option>
    `).join("");
    syncAssetSerialLabel(assetCategorySelect.value || CATEGORY_DEFINITIONS[0].key);
  } catch (error) {
    console.error("populateCategorySelect failed", error);
  }
}

function syncAssetSerialLabel(categoryKey) {
  assetSerialLabel.textContent = getCategoryDefinition(categoryKey).serialLabel;
}

function getEmployeesForEmployeesView() {
  if (state.employeesSearchSnapshot !== null) {
    return state.employeesSearchSnapshot;
  }

  return getFilteredEmployees();
}

function getFilteredEmployees() {
  const raw = state.employeeSearchRaw.trim();
  if (!raw) {
    return state.employees;
  }

  const needle = raw.toLowerCase();
  return state.employees.filter((employee) => {
    const haystack = `${employee.name} ${employee.employee_id} ${employee.email} ${employee.department}`.toLowerCase();
    return haystack.includes(needle);
  });
}

function renderEmployeeTableRows() {
  const filteredEmployees = getEmployeesForEmployeesView();
  const rows = filteredEmployees.map((employee) => {
    const assignedAssets = getEmployeeAssets(employee.id);
    return `
      <tr>
        <td>
          ${escapeHtml(employee.name)}
          <span class="muted-line">${escapeHtml(employee.email || "No email")}</span>
        </td>
        <td>${escapeHtml(employee.employee_id)}</td>
        <td>${escapeHtml(employee.department || "-")}</td>
        <td>${assignedAssets.length}</td>
        <td>${assignedAssets.length ? assignedAssets.map((asset) => escapeHtml(asset.asset_name)).join(", ") : "-"}</td>
        <td>
          <div class="table-actions">
            <button type="button" class="table-button" data-edit-employee="${employee.id}">Edit</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");

  const emptyHint = state.employeeSearchRaw.trim() ? "No employees match that search" : "No employees added yet";
  return rows || createEmptyRowMarkup(6, emptyHint);
}

function renderCategoryTableRows() {
  const assets = getFilteredCategoryAssets(state.selectedCategory);
  const rows = assets.map((asset) => {
    const employee = findEmployee(asset.assigned_employee_id);
    return `
      <tr>
        <td>${escapeHtml(asset.asset_name)}</td>
        <td>${escapeHtml(asset.serial_number)}</td>
        <td>${renderStatusBadge(asset.status === "Assigned")}</td>
        <td>${employee ? escapeHtml(formatEmployeeLabel(employee)) : "-"}</td>
        <td>
          <div class="table-actions">
            <button type="button" class="table-button" data-edit-asset="${asset.id}">Edit</button>
            ${asset.status === "Assigned"
              ? `<button type="button" class="table-button" data-release-asset="${asset.id}">Release</button>`
              : `<button type="button" class="table-button" data-assign-asset="${asset.id}">Assign</button>`}
          </div>
        </td>
      </tr>
    `;
  }).join("");

  return rows || createEmptyRowMarkup(5, "No assets in this category yet");
}

function findEmployeeByCode(employeeCode) {
  const normalizedCode = normalizeEmployeeCode(employeeCode);
  if (!normalizedCode) {
    return null;
  }

  return state.employees.find((employee) => normalizeEmployeeCode(employee.employee_id) === normalizedCode) || null;
}

function renderEmployeeSearchResult() {
  const raw = state.employeeSearchRaw.trim();

  if (!raw) {
    return '<div class="search-result">Search by name, Employee ID, email, or department. Your search text stays on this screen even if you visit Overview or a category and come back.</div>';
  }

  const matches = getEmployeesForEmployeesView();
  const exactMatch = findEmployeeByCode(state.employeeSearch);

  if (exactMatch) {
    const exactAssignedAssets = getEmployeeAssets(exactMatch.id);
    const exactAssignedAssetMarkup = exactAssignedAssets.length
      ? exactAssignedAssets.map((asset) => `<li>${escapeHtml(asset.asset_name)} <span class="muted-line">${escapeHtml(getCategoryDefinition(asset.category).label)} • ${escapeHtml(asset.serial_number)}</span></li>`).join("")
      : "<li>No assets assigned right now.</li>";

    return `
    <div class="search-result">
      <div class="search-result-card">
        <div class="search-result-head">
          <div>
            <div class="search-result-name">${escapeHtml(exactMatch.name)}</div>
            <div class="search-result-meta">${escapeHtml(exactMatch.employee_id)} • ${escapeHtml(exactMatch.department || "No department")}</div>
          </div>
          <span class="status-badge ${exactAssignedAssets.length ? "assigned" : "available"}">${exactAssignedAssets.length ? `${exactAssignedAssets.length} assigned` : "No assigned assets"}</span>
        </div>
        <div class="search-result-grid">
          <div class="mini-card">
            <h3>Employee details</h3>
            <div class="search-result-meta">${escapeHtml(exactMatch.email || "No email added")}</div>
          </div>
          <div class="mini-card">
            <h3>Assigned assets</h3>
            <ul class="asset-list">${exactAssignedAssetMarkup}</ul>
          </div>
        </div>
      </div>
    </div>`;
  }

  if (!matches.length) {
    return `<div class="search-result">No employees match <strong>${escapeHtml(raw)}</strong>.</div>`;
  }

  if (matches.length === 1) {
    const employee = matches[0];
    const assignedAssets = getEmployeeAssets(employee.id);
    const assignedAssetMarkup = assignedAssets.length
      ? assignedAssets.map((asset) => `<li>${escapeHtml(asset.asset_name)} <span class="muted-line">${escapeHtml(getCategoryDefinition(asset.category).label)} • ${escapeHtml(asset.serial_number)}</span></li>`).join("")
      : "<li>No assets assigned right now.</li>";

    return `
    <div class="search-result">
      <div class="search-result-card">
        <div class="search-result-head">
          <div>
            <div class="search-result-name">${escapeHtml(employee.name)}</div>
            <div class="search-result-meta">${escapeHtml(employee.employee_id)} • ${escapeHtml(employee.department || "No department")}</div>
          </div>
          <span class="status-badge ${assignedAssets.length ? "assigned" : "available"}">${assignedAssets.length ? `${assignedAssets.length} assigned` : "No assigned assets"}</span>
        </div>
        <div class="search-result-grid">
          <div class="mini-card">
            <h3>Employee details</h3>
            <div class="search-result-meta">${escapeHtml(employee.email || "No email added")}</div>
          </div>
          <div class="mini-card">
            <h3>Assigned assets</h3>
            <ul class="asset-list">${assignedAssetMarkup}</ul>
          </div>
        </div>
      </div>
    </div>`;
  }

  return `<div class="search-result"><strong>${matches.length}</strong> employees match <strong>${escapeHtml(raw)}</strong>. Refine the search or pick a row in the table.</div>`;
}

function renderCategorySearchResult() {
  if (!state.assetSearch) {
    return "Search by asset name, serial number, or assigned Employee ID.";
  }

  const matches = getFilteredCategoryAssets(state.selectedCategory);
  if (!matches.length) {
    return `No assets found for "${escapeHtml(state.assetSearch)}" in ${escapeHtml(getCategoryDefinition(state.selectedCategory).label)}.`;
  }

  if (matches.length === 1) {
    const asset = matches[0];
    const employee = findEmployee(asset.assigned_employee_id);
    return `${escapeHtml(asset.asset_name)} • ${escapeHtml(asset.serial_number)}${employee ? ` • ${escapeHtml(formatEmployeeLabel(employee))}` : " • Unassigned"}`;
  }

  return `${matches.length} assets found in ${escapeHtml(getCategoryDefinition(state.selectedCategory).label)}. You can search by asset name, serial number, or Employee ID.`;
}

function syncAssignmentEmployeeSelection() {
  if (!assignmentEmployeeResult || !assignmentEmployeeSelect) {
    return;
  }

  const matchedEmployee = findEmployeeByCode(state.assignmentEmployeeSearch);
  if (!state.assignmentEmployeeSearch) {
    assignmentEmployeeSelect.value = "";
    assignmentEmployeeResult.textContent = "Enter an Employee ID to load the employee name.";
    return;
  }

  if (!matchedEmployee) {
    assignmentEmployeeSelect.value = "";
    assignmentEmployeeResult.textContent = `No employee found for ${state.assignmentEmployeeSearch}.`;
    return;
  }

  assignmentEmployeeSelect.value = matchedEmployee.id;
  assignmentEmployeeResult.innerHTML = `
    <div class="search-result-card">
      <div class="search-result-name">${escapeHtml(matchedEmployee.name)}</div>
      <div class="search-result-meta">${escapeHtml(matchedEmployee.employee_id)} • ${escapeHtml(matchedEmployee.department || "No department")}</div>
    </div>
  `;
}

function openAssignmentDialog(assetId) {
  const asset = findAsset(assetId);
  if (!asset) {
    return;
  }

  assignmentForm.reset();
  state.assignmentEmployeeSearch = "";
  assignmentForm.elements.assetId.value = assetId;
  assignmentSummary.textContent = `${asset.asset_name} • ${getCategoryDefinition(asset.category).label}`;
  assignmentEmployeeSelect.innerHTML = state.employees.map((employee) => `
    <option value="${employee.id}">${escapeHtml(formatEmployeeLabel(employee))}</option>
  `).join("");
  assignmentEmployeeSelect.value = "";
  if (assignmentEmployeeCodeInput) {
    assignmentEmployeeCodeInput.value = "";
  }
  syncAssignmentEmployeeSelection();

  assignmentDialog.showModal();
}

function normalizeEmployeeCode(value) {
  return String(value || "").trim().toUpperCase();
}

function formatEmployeeLabel(employee) {
  return `${employee.name} (${employee.employee_id})`;
}

function formatDateTime(value) {
  if (!value) {
    return "-";
  }
  return new Date(value).toLocaleString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function setStoragePill(text) {
  storagePill.textContent = text;
}

function setLoading(isLoading, message = "") {
  state.isLoading = isLoading;
  if (message) {
    showAppMessage(message);
  }
  renderCurrentView();
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
  appMessage.hidden = false;
  appMessage.textContent = message;
}

function hideAppMessage() {
  appMessage.hidden = true;
  appMessage.textContent = "";
}

function toast(message, tone = "success") {
  const toastItem = document.createElement("div");
  toastItem.className = `toast toast-${tone}`;
  toastItem.textContent = message;
  toastRegion.append(toastItem);
  window.setTimeout(() => {
    toastItem.classList.add("toast-out");
    window.setTimeout(() => toastItem.remove(), 220);
  }, 2400);
}

function isCloudMode() {
  return state.authMode === "cloud" && state.storageMode === "cloud" && Boolean(supabaseClient);
}

function closeDialog(dialogId) {
  const dialog = document.getElementById(dialogId);
  if (dialog?.open) {
    dialog.close();
  }
}

function createEmptyRowMarkup(colspan, text) {
  return `<tr><td colspan="${colspan}" class="empty-text">${escapeHtml(text)}</td></tr>`;
}

function createId(prefix) {
  if (window.crypto?.randomUUID) {
    return `${prefix}-${window.crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function renderStatusBadge(isAssigned) {
  if (isAssigned) {
    return '<span class="status-badge assigned">Assigned</span>';
  }

  return '<span class="status-badge available">Available</span>';
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
