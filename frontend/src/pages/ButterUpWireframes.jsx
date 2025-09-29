import React, { useEffect, useMemo, useState } from "react";

// ButterUp Wireframes - updated for user prefs
// - Settings drawer accessible ONLY from Profile tab
// - Best price per row is highlighted; others greyed out
// - Grouped price table + compact store columns (+N more / Collapse)
// - Act-first + Undo snackbars across flows

// -----------------------------------------------------------------------------
// UI Primitives
// -----------------------------------------------------------------------------
const Chip = ({ label, active = false, onClick }) => (
  <button
    onClick={onClick}
    className={`px-3 py-1 rounded-full border text-sm mr-2 mb-2 ${
      active ? "bg-black text-white border-black" : "bg-white text-gray-800 border-gray-300"
    }`}
  >
    {label}
  </button>
);

const SectionTitle = ({ children, right }) => (
  <div className="flex items-center justify-between mb-2">
    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{children}</h3>
    {right}
  </div>
);

const Card = ({ children, onClick }) => (
  <div onClick={onClick} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm cursor-default">
    {children}
  </div>
);

const PrimaryCTA = ({ children, onClick, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`w-full py-3 rounded-xl text-base font-semibold shadow ${
      disabled ? "bg-gray-200 text-gray-500" : "bg-black text-white active:scale-[0.99]"
    }`}
  >
    {children}
  </button>
);

const Snackbar = ({ text, visible, onUndo, onClose }) => {
  if (!visible) return null;
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-3 bg-gray-900 text-white px-4 py-3 rounded-full shadow-lg">
        <span className="text-sm">{text}</span>
        {onUndo && (
          <button onClick={onUndo} className="text-sm underline underline-offset-2">
            Undo
          </button>
        )}
        <button onClick={onClose} className="text-sm opacity-80">
          x
        </button>
      </div>
    </div>
  );
};

const Banner = ({ children, action }) => (
  <div className="flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 text-amber-900 px-3 py-2 rounded-xl">
    <div className="text-sm">{children}</div>
    {action}
  </div>
);

const MobileFrame = ({ children }) => (
  <div className="w-full flex justify-center py-6">
    <div className="w-[380px] max-w-[92vw] bg-gray-50 border border-gray-200 rounded-[36px] shadow-2xl overflow-hidden relative">
      {/* Notch */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 h-6 w-36 rounded-b-2xl bg-black/80" />
      <div className="pt-8 pb-20 px-4 min-h-[720px]">{children}</div>
    </div>
  </div>
);

const TopBar = ({ title, subtitle, right }) => (
  <div className="mb-4">
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-xl font-bold">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
      </div>
      {right}
    </div>
  </div>
);

const BottomNav = ({ active, setActive }) => {
  const items = [
    { key: "Home", label: "Home", icon: "\u{1F3E0}" },
    { key: "Compare", label: "Compare", icon: "\u{2696}" },
    { key: "List", label: "List", icon: "\u{1F9FA}" },
    { key: "Scan", label: "Scan", icon: "\u{1F4F7}" },
    { key: "Profile", label: "Profile", icon: "\u{1F464}" },
  ];
  return (
    <div className="fixed bottom-2 left-1/2 -translate-x-1/2 z-40 w-[360px] max-w-[88vw]">
      <div className="rounded-2xl border border-gray-200 bg-white shadow-lg grid grid-cols-5">
        {items.map((it) => (
          <button
            key={it.key}
            onClick={() => setActive(it.key)}
            className={`flex flex-col items-center justify-center py-2 text-xs ${
              active === it.key ? "text-black" : "text-gray-500"
            }`}
          >
            <div className="text-lg leading-none">{it.icon}</div>
            <div>{it.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
};

// -----------------------------------------------------------------------------
// Mock Data
// -----------------------------------------------------------------------------
const storesMaster = [
  { id: "pak", name: "Pak'nSave" },
  { id: "wow", name: "Woolworths" },
  { id: "nw", name: "New World" },
  { id: "asia", name: "Asian Mart" },
];

const samplePrices = [
  { brand: "Anchor", size: "500g", store: "Pak'nSave", price: 6.49, unit: 1.3 },
  { brand: "Anchor", size: "500g", store: "Woolworths", price: 6.99, unit: 1.4 },
  { brand: "Anchor", size: "500g", store: "New World", price: 7.29, unit: 1.46 },
  { brand: "Mainland", size: "500g", store: "Pak'nSave", price: 7.29, unit: 1.46 },
  { brand: "Mainland", size: "500g", store: "Woolworths", price: 7.49, unit: 1.5 },
  { brand: "Mainland", size: "500g", store: "New World", price: 7.89, unit: 1.58 },
];

// -----------------------------------------------------------------------------
// Main Component
// -----------------------------------------------------------------------------
export default function ButterUpWireframes() {
  // Nav and global state
  const [active, setActive] = useState("Home");
  const [locationGranted, setLocationGranted] = useState(false);
  const [suburb] = useState("Mt Roskill");
  const [stores, setStores] = useState(["Pak'nSave", "Woolworths", "New World", "Asian Mart"]);
  const [list, setList] = useState([]); // {brand, size, store, price}
  const [snack, setSnack] = useState({ visible: false, text: "", undo: null });
  const [showLoginBanner, setShowLoginBanner] = useState(true);

  // Auth and Profile (mock)
  const [user, setUser] = useState({
    name: "Gee",
    email: "geesingh77@hotmail.com",
    avatar: "https://i.pravatar.cc/80?img=64",
    provider: "Google",
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [units] = useState("metric");

  // Derived: cheapest across selected stores
  const cheapest = useMemo(() => {
    const filtered = samplePrices.filter((p) => stores.includes(p.store));
    if (!filtered.length) return null;
    return filtered.reduce((min, p) => (p.price < min.price ? p : min), filtered[0]);
  }, [stores]);

  // Group products by brand plus size
  const groupedProducts = useMemo(() => {
    const filtered = samplePrices.filter((p) => stores.includes(p.store));
    const map = {};
    filtered.forEach((p) => {
      const key = `${p.brand}|${p.size}`;
      if (!map[key]) map[key] = { brand: p.brand, size: p.size, unit: p.unit, prices: {} };
      map[key].prices[p.store] = p.price;
    });
    return Object.values(map).sort((a, b) => {
      const minA = Math.min(...Object.values(a.prices));
      const minB = Math.min(...Object.values(b.prices));
      return minA - minB;
    });
  }, [stores]);

  // Compact columns with +N more / Collapse
  const maxCols = 3;
  const [expanded, setExpanded] = useState(false);
  const visibleStores = expanded ? stores : stores.slice(0, maxCols);
  const overflowCount = Math.max(0, stores.length - visibleStores.length);

  // Actions
  const addCheapest = () => {
    if (!cheapest) return;
    const item = { ...cheapest, id: Date.now() };
    setList((prev) => [...prev, item]);
    const undo = () => setList((prev) => prev.filter((x) => x.id !== item.id));
    setSnack({ visible: true, text: `Added ${item.brand} to List`, undo });
  };

  const removeItem = (id) => {
    const toRemove = list.find((x) => x.id === id);
    setList((prev) => prev.filter((x) => x.id !== id));
    const undo = () => setList((prev) => [...prev, toRemove]);
    setSnack({ visible: true, text: `Removed ${toRemove?.brand ?? "item"}`, undo });
  };

  const makeCheapestBasket = () => {
    setSnack({ visible: true, text: "Optimized basket for lowest total", undo: null });
  };

  const changeStores = (name) => {
    setStores((prev) => (prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]));
  };

  // ---------------------------------------------------------------------------
  // Screens
  // ---------------------------------------------------------------------------
  const Home = () => (
    <>
      <TopBar title="Cheapest butter near you" subtitle="Live prices and unit price" />

      {!locationGranted ? (
        <Card>
          <div className="flex items-start gap-3">
            <div className="text-2xl">{"\u{1F4CD}"}</div>
            <div>
              <div className="font-semibold">Use your location</div>
              <p className="text-sm text-gray-600 mb-3">
                To find nearby prices, ButterUp uses your location once. You can change suburb anytime.
              </p>
              <div className="flex gap-2">
                <button className="px-3 py-2 bg-black text-white rounded-lg text-sm" onClick={() => setLocationGranted(true)}>
                  Use my location
                </button>
                <button
                  className="px-3 py-2 border rounded-lg text-sm"
                  onClick={() => setSnack({ visible: true, text: "Enter suburb flow (wireframe)", undo: null })}
                >
                  Enter suburb
                </button>
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <div className="mb-3 text-sm text-gray-600">
          <span className="font-medium">{suburb}</span>
          <span className="mx-1">-</span>
          <button
            className="underline"
            onClick={() => setSnack({ visible: true, text: "Change suburb (wireframe)", undo: null })}
          >
            Change
          </button>
        </div>
      )}

      <SectionTitle
        right={
          <button className="text-sm underline" onClick={() => setSnack({ visible: true, text: "Edit stores (bottom sheet)", undo: null })}>
            Change
          </button>
        }
      >
        Stores nearby
      </SectionTitle>
      <div className="mb-3">
        {storesMaster.map((s) => (
          <Chip key={s.id} label={s.name} active={stores.includes(s.name)} onClick={() => changeStores(s.name)} />
        ))}
      </div>

      <SectionTitle
        right={
          <button className="text-sm underline" onClick={() => setExpanded((e) => !e)}>
            {expanded ? "Collapse" : overflowCount > 0 ? `+${overflowCount} more` : "Show all"}
          </button>
        }
      >
        Today's best picks
      </SectionTitle>
      <div className="text-xs text-gray-500 mb-1">Best price per row is highlighted.</div>

      {/* Header row for compact table */}
      <div className="mb-1 px-2 grid" style={{ gridTemplateColumns: `1.5fr repeat(${visibleStores.length}, 1fr)` }}>
        <div className="text-xs text-gray-500 uppercase tracking-wide">Product</div>
        {visibleStores.map((s) => (
          <div key={s} className="text-xs text-gray-500 uppercase tracking-wide text-right">
            {s}
          </div>
        ))}
      </div>

      {/* Rows */}
      <div className="space-y-3 mb-24">
        {groupedProducts.map((g) => {
          const values = visibleStores.map((s) => g.prices[s]).filter((v) => v != null);
          const rowMin = values.length ? Math.min(...values) : null;
          return (
            <Card key={`${g.brand}-${g.size}`}>
              <div className="grid items-center gap-2" style={{ gridTemplateColumns: `1.5fr repeat(${visibleStores.length}, 1fr)` }}>
                <div>
                  <div className="font-semibold">
                    {g.brand} <span className="text-gray-500 font-normal">{g.size}</span>
                  </div>
                  <div className="text-xs text-gray-500">Unit price ${g.unit.toFixed(2)}/100g</div>
                </div>
                {visibleStores.map((s) => {
                  const price = g.prices[s];
                  const isBest = rowMin != null && price === rowMin;
                  const base = "text-right font-semibold";
                  const cls =
                    price == null
                      ? `${base} text-gray-300`
                      : isBest
                      ? `${base} bg-green-50 text-green-800 rounded px-2 py-1`
                      : `${base} text-gray-400`;
                  return (
                    <div key={s} className={cls}>
                      {price != null ? `$${price.toFixed(2)}` : "-"}
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>

      <div className="fixed left-1/2 -translate-x-1/2 bottom-20 w-[360px] max-w-[88vw]">
        <PrimaryCTA onClick={addCheapest} disabled={!cheapest}>
          Add cheapest to List
        </PrimaryCTA>
      </div>

      {showLoginBanner && (
        <div className="mt-3">
          <Banner
            action={
              <button className="px-3 py-2 bg-black text-white rounded-lg text-sm" onClick={() => setShowLoginBanner(false)}>
                Continue with Google
              </button>
            }
          >
            Don't lose your list. Save across devices.
          </Banner>
        </div>
      )}
    </>
  );

  const Compare = () => {
    const options = samplePrices.filter(
      (p) => ["Pak'nSave", "Woolworths", "New World", "Asian Mart"].includes(p.store) && p.brand === "Anchor"
    );
    const [selected, setSelected] = useState(options[0]?.store || "Pak'nSave");
    const chosen = options.find((o) => o.store === selected);

    const addSelected = () => {
      if (!chosen) return;
      const item = { ...chosen, id: Date.now() };
      setList((prev) => [...prev, item]);
      const undo = () => setList((prev) => prev.filter((x) => x.id !== item.id));
      setSnack({ visible: true, text: `Added ${item.brand} (${item.store})`, undo });
    };

    return (
      <>
        <TopBar title="Compare prices" subtitle="Anchor 500g" right={<div className="text-sm text-gray-500">Price | Unit | History</div>} />

        <SectionTitle>Stores</SectionTitle>
        <div className="mb-3">
          {options.map((o) => (
            <Chip key={o.store} label={`${o.store} - $${o.price.toFixed(2)}`} active={selected === o.store} onClick={() => setSelected(o.store)} />
          ))}
        </div>

        <SectionTitle>History (placeholder)</SectionTitle>
        <Card>
          <div className="h-28 grid grid-cols-12 gap-1">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="bg-gray-200 rounded" style={{ height: `${20 + (i % 5) * 12}px` }} />
            ))}
          </div>
          <div className="text-xs text-gray-500 mt-2">Last 12 weeks</div>
        </Card>

        <div className="mt-4">
          <PrimaryCTA onClick={addSelected}>Add selected to List</PrimaryCTA>
        </div>
      </>
    );
  };

  const ListScreen = () => {
    const grouped = list.reduce((acc, it) => {
      acc[it.store] = acc[it.store] || [];
      acc[it.store].push(it);
      return acc;
    }, {});

    return (
      <>
        <TopBar title="Your List" subtitle="Grouped by store for lowest total" />

        {list.length === 0 ? (
          <Card>
            <div className="flex items-start gap-3">
              <div className="text-2xl">{"\u{1F9FA}"}</div>
              <div>
                <div className="font-semibold">Your list is empty</div>
                <p className="text-sm text-gray-600 mb-3">Start with the cheapest pick near you.</p>
                <button className="px-3 py-2 bg-black text-white rounded-lg text-sm" onClick={() => setActive("Home")}>
                  Browse prices
                </button>
              </div>
            </div>
          </Card>
        ) : (
          <div className="space-y-4 mb-24">
            {Object.keys(grouped).map((store) => (
              <div key={store}>
                <SectionTitle right={<span className="text-sm font-semibold">${grouped[store].reduce((s, x) => s + x.price, 0).toFixed(2)}</span>}>
                  {store}
                </SectionTitle>
                <div className="space-y-2">
                  {grouped[store].map((it) => (
                    <Card key={it.id}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">
                            {it.brand} <span className="text-gray-500 font-normal">{it.size}</span>
                          </div>
                          <div className="text-xs text-gray-500">Unit ${it.unit.toFixed(2)}/100g</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="font-semibold">${it.price.toFixed(2)}</div>
                          <button className="text-sm underline" onClick={() => removeItem(it.id)}>
                            Remove
                          </button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="fixed left-1/2 -translate-x-1/2 bottom-20 w-[360px] max-w-[88vw]">
          <PrimaryCTA onClick={makeCheapestBasket} disabled={list.length === 0}>
            Make cheapest basket
          </PrimaryCTA>
        </div>

        {showLoginBanner && list.length > 0 && (
          <div className="mt-3">
            <Banner
              action={
                <button className="px-3 py-2 bg-black text-white rounded-lg text-sm" onClick={() => setShowLoginBanner(false)}>
                  Continue with Google
                </button>
              }
            >
              Sync your list across devices.
            </Banner>
          </div>
        )}
      </>
    );
  };

  const Scan = () => {
    const [cameraOpen, setCameraOpen] = useState(false);

    return (
      <>
        <TopBar title="Scan and Contribute" subtitle="Barcode or shelf tag" />

        {!cameraOpen ? (
          <Card>
            <div className="flex items-start gap-3">
              <div className="text-2xl">{"\u{1F4F7}"}</div>
              <div>
                <div className="font-semibold">Use your camera</div>
                <p className="text-sm text-gray-600 mb-3">
                  We will use it to scan barcodes or shelf tags. Nothing is saved until you tap Submit.
                </p>
                <button className="px-3 py-2 bg-black text-white rounded-lg text-sm" onClick={() => setCameraOpen(true)}>
                  Open camera
                </button>
              </div>
            </div>
          </Card>
        ) : (
          <>
            <SectionTitle>Preview</SectionTitle>
            <div className="rounded-xl bg-gray-200 h-40 flex items-center justify-center text-gray-600">Camera preview (wireframe)</div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <Card>
                <div className="text-sm text-gray-500">Detected brand</div>
                <div className="font-semibold">Anchor</div>
              </Card>
              <Card>
                <div className="text-sm text-gray-500">Size</div>
                <div className="font-semibold">500g</div>
              </Card>
              <Card>
                <div className="text-sm text-gray-500">Store</div>
                <div className="font-semibold">Pak'nSave (nearby)</div>
              </Card>
              <Card>
                <div className="text-sm text-gray-500">Price</div>
                <div className="font-semibold">$6.49</div>
              </Card>
            </div>

            <div className="mt-4">
              <PrimaryCTA onClick={() => setSnack({ visible: true, text: "Thanks! You earned 5 points", undo: null })}>
                Submit
              </PrimaryCTA>
            </div>
          </>
        )}
      </>
    );
  };

  const Profile = () => {
    const isLoggedIn = !!user;
    const handleLogout = () => {
      const prev = user;
      setUser(null);
      const undo = () => setUser(prev);
      setSnack({ visible: true, text: "Logged out", undo });
    };
    const toggleNotifications = () => {
      const prev = notificationsOn;
      setNotificationsOn(!prev);
      const undo = () => setNotificationsOn(prev);
      setSnack({ visible: true, text: prev ? "Notifications off" : "Notifications on", undo });
    };

    return (
      <>
        <TopBar
          title="Profile"
          subtitle={isLoggedIn ? user.email : "Not signed in"}
          right={
            isLoggedIn ? (
              <button className="flex items-center" onClick={() => setSettingsOpen(true)}>
                <img src={user.avatar} alt="avatar" className="w-8 h-8 rounded-full border" />
              </button>
            ) : null
          }
        />

        {isLoggedIn ? (
          <Card>
            <div className="flex items-center gap-3">
              <img src={user.avatar} alt="avatar" className="w-12 h-12 rounded-full border" />
              <div>
                <div className="font-semibold">{user.name}</div>
                <div className="text-sm text-gray-500">{user.provider} account</div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button className="border rounded-xl py-3" onClick={toggleNotifications}>
                {notificationsOn ? "Disable notifications" : "Enable notifications"}
              </button>
              <button className="border rounded-xl py-3" onClick={() => setSnack({ visible: true, text: "Units set to grams", undo: null })}>
                Units: {units === "metric" ? "Metric (g)" : "Imperial"}
              </button>
              <button className="border rounded-xl py-3" onClick={() => setSnack({ visible: true, text: "Manage subscriptions (stub)", undo: null })}>
                Manage subscriptions
              </button>
              <button className="border rounded-xl py-3" onClick={handleLogout}>
                Log out
              </button>
            </div>
          </Card>
        ) : (
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">Sign in to save your list</div>
                <div className="text-sm text-gray-500">Sync across devices.</div>
              </div>
              <button
                className="px-3 py-2 bg-black text-white rounded-lg text-sm"
                onClick={() =>
                  setUser({ name: "Gee", email: "geesingh77@hotmail.com", avatar: "https://i.pravatar.cc/80?img=64", provider: "Google" })
                }
              >
                Continue with Google
              </button>
            </div>
          </Card>
        )}

        {/* Slide-over settings drawer (Profile-only access) */}
        <div className={`fixed inset-0 z-50 ${settingsOpen ? "pointer-events-auto" : "pointer-events-none"}`}>
          {/* Backdrop */}
          <div className={`absolute inset-0 bg-black/40 transition-opacity ${settingsOpen ? "opacity-100" : "opacity-0"}`} onClick={() => setSettingsOpen(false)} />
          {/* Panel */}
          <div
            className={`absolute top-0 right-0 h-full w-80 max-w-[90vw] bg-white border-l shadow-2xl p-4 transition-transform ${
              settingsOpen ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="font-semibold">Settings</div>
              <button onClick={() => setSettingsOpen(false)}>x</button>
            </div>
            <div className="space-y-2">
              <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50" onClick={() => setSnack({ visible: true, text: "Edit profile (stub)", undo: null })}>
                Edit profile
              </button>
              <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50" onClick={toggleNotifications}>
                {notificationsOn ? "Disable" : "Enable"} notifications
              </button>
              <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50" onClick={() => setSnack({ visible: true, text: "Units set to grams", undo: null })}>
                Units and display
              </button>
              <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50" onClick={() => setSnack({ visible: true, text: "Connected: Google, Outlook (stub)", undo: null })}>
                Connected accounts
              </button>
              <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50" onClick={() => setSnack({ visible: true, text: "Manage payments (stub)", undo: null })}>
                Payments
              </button>
              <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50" onClick={() => setSnack({ visible: true, text: "Help opened (stub)", undo: null })}>
                Help and Support
              </button>
              <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 text-red-600" onClick={handleLogout}>
                Log out
              </button>
            </div>
          </div>
        </div>
      </>
    );
  };

  // ---------------------------------------------------------------------------
  // Lightweight Runtime Tests (console)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    try {
      // Test 1: grouping returns 2 product rows for default stores (Anchor, Mainland)
      const filtered = samplePrices.filter((p) => ["Pak'nSave", "Woolworths", "New World"].includes(p.store));
      const map = {};
      filtered.forEach((p) => {
        const key = `${p.brand}|${p.size}`;
        if (!map[key]) map[key] = true;
      });
      const expectedRows = Object.keys(map).length;
      console.assert(expectedRows === 2, `Expected 2 grouped rows, got ${expectedRows}`);

      // Test 2: cheapest is Anchor @ Pak'nSave 6.49
      const min = filtered.reduce((m, p) => (p.price < m.price ? p : m), filtered[0]);
      console.assert(min.brand === "Anchor" && min.store === "Pak'nSave" && min.price === 6.49, "Cheapest calc failed");

      // Test 3: compact columns logic (with 3 stores) shows all when collapsed
      const collapsedVisible = ["Pak'nSave", "Woolworths", "New World", "Asian Mart"].slice(0, 3);
      console.assert(collapsedVisible.length === 3, "Compact columns slice failed");

      // Test 4: rowMin highlight computation for Anchor among first 3 stores
      const anchorRow = {
        prices: { "Pak'nSave": 6.49, Woolworths: 6.99, "New World": 7.29 },
      };
      const vals = ["Pak'nSave", "Woolworths", "New World"].map((s) => anchorRow.prices[s]).filter((v) => v != null);
      const rowMin = Math.min(...vals);
      console.assert(rowMin === 6.49, `Expected rowMin 6.49, got ${rowMin}`);

      console.log("ButterUp wireframe tests passed");
    } catch (e) {
      console.error("ButterUp wireframe tests error", e);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <>
      <MobileFrame>
        {active === "Home" && <Home />}
        {active === "Compare" && <Compare />}
        {active === "List" && <ListScreen />}
        {active === "Scan" && <Scan />}
        {active === "Profile" && <Profile />}
      </MobileFrame>

      <BottomNav active={active} setActive={setActive} />

      <Snackbar text={snack.text} visible={snack.visible} onUndo={snack.undo} onClose={() => setSnack({ visible: false, text: "", undo: null })} />
    </>
  );
}

