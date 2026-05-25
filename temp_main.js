
// â”€â”€ Staff & Vehicle Data Loading â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
var _staffData = [], _vehicleData = [], _staffTabFilter = 'All';
var _SLUG = (window.__TENANT__ && window.__TENANT__.slug) ? window.__TENANT__.slug : '';

function loadStaff() {
  apiFetch('/' + _SLUG + '/api/admin/staff').then(function(r){return r.json();}).then(function(rows) {
    _staffData = Array.isArray(rows) ? rows : [];
    renderStaff(_staffData);
  }).catch(function(){
    var tb = document.getElementById('staff-tbody');
    if(tb) tb.innerHTML = '<tr><td colspan="5"><div class="empty"><span class="material-symbols-outlined">error</span><p>Failed to load staff</p></div></td></tr>';
  });
}

function renderStaff(list) {
  var tb = document.getElementById('staff-tbody');
  if(!tb) return;
  if(!list || !list.length) { tb.innerHTML = '<tr><td colspan="7"><div class="empty"><span class="material-symbols-outlined">badge</span><p>No staff records found</p></div></td></tr>'; return; }
  var roleColors = {'Driver':'#ede9fe;color:#7c3aed','Document Controller':'#dcfce7;color:#15803d','Manager':'#dbeafe;color:#1d4ed8','Admin':'#fef3c7;color:#b45309'};
  tb.innerHTML = list.map(function(s) {
    var rc = roleColors[s.role] || '#f1f5f9;color:#64748b';
    var exp = s.license_expiry ? new Date(s.license_expiry).toLocaleDateString() : 'â€”';
    var sid = s.staff_id || s.id || '';
    var isSuspended = s.status === 'suspended';
    var suspendIcon = isSuspended ? 'play_arrow' : 'pause';
    var suspendColor = isSuspended ? '#10b981' : '#f59e0b';
    var hideBtns = s.is_current_user || s.role === 'Admin' || s.role === 'admin';
    var suspendBtn = (sid && !hideBtns) ? '<button onclick="toggleSuspend(\'' + sid + '\', ' + isSuspended + ')" style="background:none;border:none;cursor:pointer;color:' + suspendColor + ';padding:3px 6px;border-radius:6px;margin-right:4px;" title="' + (isSuspended ? 'Activate' : 'Suspend') + '"><span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle;">' + suspendIcon + '</span></button>' : '';
    var delBtn = (sid && !hideBtns) ? '<button onclick="deleteStaff(\'' + sid + '\',this)" style="background:none;border:none;cursor:pointer;color:#ef4444;padding:3px 6px;border-radius:6px;" title="Remove"><span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle;">delete</span></button>' : '';
    // License status badge + review button (only for drivers)
    var licStatus = s.license_status || 'not_uploaded';
    var licBadge = 'â€”';
    if (s.role === 'Driver') {
      if (licStatus === 'verified') {
        licBadge = '<span style="background:#dcfce7;color:#15803d;padding:2px 8px;border-radius:99px;font-size:10px;font-weight:700;"><span class="material-symbols-outlined" style="font-size:12px;vertical-align:middle;margin-right:2px;">check_circle</span>Verified</span>';
      } else if (licStatus === 'pending_review') {
        licBadge = '<button onclick="openLicenseModal(\'' + sid + '\')" style="background:#fef3c7;color:#b45309;padding:3px 10px;border-radius:99px;font-size:10px;font-weight:700;border:1px solid #fde68a;cursor:pointer;font-family:inherit;"><span class="material-symbols-outlined" style="font-size:12px;vertical-align:middle;margin-right:2px;">schedule</span>Pending â€” Review</button>';
      } else if (licStatus === 'expired') {
        licBadge = '<span style="background:#fef2f2;color:#dc2626;padding:2px 8px;border-radius:99px;font-size:10px;font-weight:700;">Expired</span>';
      } else {
        licBadge = '<span style="background:#f1f5f9;color:#94a3b8;padding:2px 8px;border-radius:99px;font-size:10px;font-weight:700;">Not Uploaded</span>';
      }
    }
    return '<tr>' +
      '<td><strong>' + esc(s.name || s.first_name || 'â€”') + '</strong></td>' +
      '<td><span style="background:' + rc + ';padding:2px 9px;border-radius:99px;font-size:10px;font-weight:700;">' + esc(s.role||'â€”') + '</span></td>' +
      '<td style="font-family:monospace;font-size:12px;">' + esc(s.username||'â€”') + '</td>' +
      '<td>' + exp + '</td>' +
      '<td>' + licBadge + '</td>' +
      '<td><span class="badge ' + (s.status==='active'||s.status==='Available'?'b-delivered':(isSuspended?'b-declined':'b-pending')) + '">' + esc(s.status||'â€”') + '</span></td>' +
      '<td>' + suspendBtn + delBtn + '</td></tr>';
  }).join('');
  // Update pending license badge on Staff nav
  var pendingCount = list.filter(function(s) { return s.role === 'Driver' && s.license_status === 'pending_review'; }).length;
  var badge = document.getElementById('staff-pending-badge');
  if (badge) { badge.textContent = pendingCount; badge.style.display = pendingCount > 0 ? '' : 'none'; }
}

function filterStaffTab(role, btn) {
  _staffTabFilter = role;
  document.querySelectorAll('#s-staff .tab').forEach(function(t){t.classList.remove('active');});
  if(btn) btn.classList.add('active');
  var filtered = role === 'All' ? _staffData : _staffData.filter(function(s){return s.role === role;});
  renderStaff(filtered);
}
function filterStaffStatus(val) {
  var filtered = val ? _staffData.filter(function(s){return (s.status||'').toLowerCase().includes(val.toLowerCase());}) : _staffData;
  if(_staffTabFilter !== 'All') filtered = filtered.filter(function(s){return s.role === _staffTabFilter;});
  renderStaff(filtered);
}

function loadVehicles() {
  apiFetch('/' + _SLUG + '/api/admin/vehicles').then(function(r){return r.json();}).then(function(rows) {
    _vehicleData = Array.isArray(rows) ? rows : [];
    renderVehicles(_vehicleData);
  }).catch(function(){
    var tb = document.getElementById('vehicles-tbody');
    if(tb) tb.innerHTML = '<tr><td colspan="7"><div class="empty"><span class="material-symbols-outlined">error</span><p>Failed to load vehicles</p></div></td></tr>';
  });
  loadVehicleRequests();
  loadPackageCategories();
}

function renderVehicles(list) {
  var tb = document.getElementById('vehicles-tbody');
  if(!tb) return;
  if(!list || !list.length) { tb.innerHTML = '<tr><td colspan="9"><div class="empty"><span class="material-symbols-outlined">directions_car</span><p>No vehicles registered</p></div></td></tr>'; return; }
  var stColors = {'Available':'b-delivered','On-Duty':'b-transit','Maintenance':'b-awaiting','Retired':'b-declined'};
  tb.innerHTML = list.map(function(v) {
    var plate = v.plate_number || '';
    var delBtn    = plate ? '<button onclick="deleteVehicle(\'' + plate + '\',this)" style="background:none;border:none;cursor:pointer;color:#ef4444;padding:3px 6px;border-radius:6px;" title="Remove"><span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle;">delete</span></button>' : '';
    var updateBtn = plate ? '<button onclick="openUpdateVehicleModal(\'' + plate + '\', \'' + (v.vehicle_type||'') + '\', \'' + (v.capacity_tons||'') + '\', \'' + (v.status||'Available') + '\', \'' + esc(v.model||'') + '\', \'' + (v.ownership_type||'company') + '\', \'' + (v.image_url ? '1' : '') + '\')" style="background:none;border:none;cursor:pointer;color:#3b82f6;padding:3px 6px;border-radius:6px;" title="Edit"><span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle;">edit</span></button>' : '';
    var assignBtn = (plate && v.status === 'Available') ? '<button onclick="openAssignVehicleModal(\'' + plate + '\')" style="background:none;border:none;cursor:pointer;color:#f59e0b;padding:3px 6px;border-radius:6px;" title="Assign to Driver"><span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle;">person_add</span></button>' : '';
    var ownerBadge = v.ownership_type === 'employee' ? '<span style="display:inline-block;padding:2px 8px;border-radius:99px;font-size:10px;font-weight:700;background:#fef3c7;color:#d97706;">Employee</span>' : '<span style="display:inline-block;padding:2px 8px;border-radius:99px;font-size:10px;font-weight:700;background:#dbeafe;color:#2563eb;">Company</span>';
    var imgCell = v.image_url
      ? '<div onclick="viewVehicleImage(\'' + v.image_url.replace(/'/g, "\\'") + '\', \'' + esc(plate) + '\')" style="cursor:pointer;" title="Click to zoom"><img src="' + v.image_url + '" style="width:36px;height:36px;border-radius:8px;object-fit:cover;border:1px solid #e2e8f0;transition:transform .15s;" onmouseover="this.style.transform=\'scale(1.15)\'" onmouseout="this.style.transform=\'scale(1)\'"></div>'
      : '<div onclick="showNoImageToast()" style="width:36px;height:36px;border-radius:8px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;cursor:pointer;" title="No image available"><span class="material-symbols-outlined" style="font-size:18px;color:#94a3b8;">directions_car</span></div>';
    return '<tr>' +
      '<td>' + imgCell + '</td>' +
      '<td><strong style="font-family:monospace;">' + esc(v.plate_number||'â€”') + '</strong></td>' +
      '<td>' + esc(v.vehicle_type||'â€”') + '</td>' +
      '<td style="color:#64748b;font-size:12px;">' + esc(v.model||'â€”') + '</td>' +
      '<td>' + (v.capacity_tons || 'â€”') + '</td>' +
      '<td>' + ownerBadge + '</td>' +
      '<td><span class="badge ' + (stColors[v.status]||'b-pending') + '">' + esc(v.status||'â€”') + '</span></td>' +
      '<td>' + esc(v.assigned_driver_name||'â€”') + '</td>' +
      '<td><div style="display:flex;gap:2px;">' + assignBtn + updateBtn + delBtn + '</div></td></tr>';
  }).join('');
}

// â”€â”€ Vehicle Image Lightbox â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function viewVehicleImage(url, plate) {
  var overlay = document.getElementById('vehicle-img-lightbox');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'vehicle-img-lightbox';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:14px;opacity:0;transition:opacity .25s;cursor:pointer;';
    overlay.innerHTML = '<div id="vimg-title" style="color:#fff;font-size:14px;font-weight:700;letter-spacing:.03em;"></div><img id="vimg-src" src="" style="max-width:85vw;max-height:75vh;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,0.5);object-fit:contain;"><div style="color:#94a3b8;font-size:12px;margin-top:4px;">Click anywhere to close</div>';
    overlay.onclick = function() { overlay.style.opacity = '0'; setTimeout(function(){ overlay.style.display = 'none'; }, 250); };
    document.body.appendChild(overlay);
  }
  document.getElementById('vimg-title').textContent = plate ? 'Vehicle: ' + plate : 'Vehicle Image';
  document.getElementById('vimg-src').src = url;
  overlay.style.display = 'flex';
  requestAnimationFrame(function() { overlay.style.opacity = '1'; });
}

function showNoImageToast() {
  var t = document.getElementById('no-img-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'no-img-toast';
    t.style.cssText = 'position:fixed;bottom:30px;left:50%;transform:translateX(-50%);background:#1e293b;color:#fff;padding:10px 22px;border-radius:10px;font-size:13px;font-weight:600;z-index:9999;display:flex;align-items:center;gap:8px;box-shadow:0 8px 30px rgba(0,0,0,0.2);transition:opacity .3s;';
    t.innerHTML = '<span class="material-symbols-outlined" style="font-size:16px;color:#f59e0b;">image_not_supported</span> No vehicle image available';
    document.body.appendChild(t);
  }
  t.style.opacity = '1'; t.style.display = 'flex';
  clearTimeout(window._noImgTimer);
  window._noImgTimer = setTimeout(function() { t.style.opacity = '0'; setTimeout(function(){ t.style.display = 'none'; }, 300); }, 2500);
}

// â”€â”€ Package Categories (global tenant-level) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
var _ALL_PKG_CATS = ['Package','Food','Document','Bulk','Vehicle'];
// Display labels â€” internal DB keys stay the same so mobile mapping works
var _PKG_CAT_LABELS = { Package: 'Standard Package', Food: 'Food', Document: 'Document', Bulk: 'Bulk Freight', Vehicle: 'Vehicle' };
var _activePkgCats = [];
function loadPackageCategories() {
  apiFetch('/' + _SLUG + '/api/admin/package-categories').then(function(r){return r.json();}).then(function(d) {
    _activePkgCats = d.categories || _ALL_PKG_CATS;
    renderPackageCategories();
  });
}
function renderPackageCategories() {
  var el = document.getElementById('pkg-cat-list');
  if(!el) return;
  el.innerHTML = _ALL_PKG_CATS.map(function(cat) {
    var on = _activePkgCats.includes(cat);
    var label = _PKG_CAT_LABELS[cat] || cat;
    return '<button onclick="togglePkgCat(\'' + cat + '\')" style="' +
      'display:inline-flex;align-items:center;gap:7px;padding:7px 16px;border-radius:999px;border:none;cursor:pointer;font-size:12px;font-weight:700;transition:all 0.15s;' +
      (on ? 'background:#16a34a;color:#fff;box-shadow:0 2px 8px rgba(22,163,74,0.3);' : 'background:#f1f5f9;color:#94a3b8;') + '">' +
      '<span style="font-size:14px;">' + (on ? 'âœ“' : 'âœ•') + '</span>' + label +
    '</button>';
  }).join('');
}
function togglePkgCat(cat) {
  var idx = _activePkgCats.indexOf(cat);
  if(idx > -1) { _activePkgCats.splice(idx, 1); }
  else          { _activePkgCats.push(cat); }
  renderPackageCategories();
}
async function savePackageCategories() {
  var btn = document.getElementById('pkg-cat-save-btn');
  if(btn) { btn.disabled = true; btn.textContent = 'Savingâ€¦'; }
  try {
    await apiFetch('/' + _SLUG + '/api/admin/package-categories', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categories: _activePkgCats })
    });
    if(btn) { btn.textContent = 'âœ“ Saved'; btn.style.background = '#16a34a'; }
    setTimeout(function() {
      if(btn) { btn.disabled = false; btn.textContent = 'Save Changes'; btn.style.background = ''; }
    }, 2000);
  } catch(e) {
    if(btn) { btn.disabled = false; btn.textContent = 'Save Changes'; }
    alert('Failed to save. Please try again.');
  }
}

// â”€â”€ Vehicle Requests â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function loadVehicleRequests() {
  var el = document.getElementById('vehicle-requests-list');
  if(!el) return;
  apiFetch('/' + _SLUG + '/api/admin/vehicle-requests').then(function(r){return r.json();}).then(function(rows) {
    var pending = Array.isArray(rows) ? rows.filter(function(r){return r.status==='pending';}) : [];
    if(!pending.length) {
      el.innerHTML = '<p style="color:var(--text-muted);font-size:12px;text-align:center;padding:8px 0;">No pending requests</p>';
      return;
    }
    el.innerHTML = pending.map(function(r) {
      var isAssignment = r.request_type === 'staff_assignment';
      var flagHtml = r.refusal_count >= 3
        ? '<span style="background:#fef2f2;color:#dc2626;font-size:9px;font-weight:800;padding:2px 8px;border-radius:20px;margin-left:6px;">âš  ' + r.refusal_count + 'x refused</span>'
        : (r.refusal_count > 0 ? '<span style="background:#fff7ed;color:#ea580c;font-size:9px;font-weight:700;padding:2px 8px;border-radius:20px;margin-left:6px;">' + r.refusal_count + 'x refused</span>' : '');
      var typeLabel = isAssignment
        ? '<span style="background:#ede9fe;color:#7c3aed;font-size:9px;font-weight:800;padding:2px 8px;border-radius:20px;">STAFF ASSIGNED</span>'
        : '<span style="background:#dbeafe;color:#1d4ed8;font-size:9px;font-weight:800;padding:2px 8px;border-radius:20px;">DRIVER REQUEST</span>';
      var approveBtn = !isAssignment ? '<button class="btn btn-primary btn-sm" style="font-size:11px;padding:4px 12px;" onclick="approveVehicleRequest(' + r.id + ')">âœ“ Approve</button>' : '';
      var denyBtn = '<button class="btn btn-sm" style="font-size:11px;padding:4px 12px;background:var(--bg-2);" onclick="denyVehicleRequest(' + r.id + ')">âœ• Deny</button>';
      return '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid var(--border);">' +
        '<div style="flex:1;min-width:0;">' +
          '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">' +
            typeLabel + flagHtml +
            '<strong style="font-family:monospace;font-size:13px;">' + esc(r.vehicle_plate) + '</strong>' +
          '</div>' +
          '<p style="margin:2px 0 0;font-size:11px;color:var(--text-muted);">' + esc(r.driver_name) + ' Â· ' + esc(r.vehicle_type) + (r.model ? ' Â· ' + esc(r.model) : '') + '</p>' +
        '</div>' +
        '<div style="display:flex;gap:6px;flex-shrink:0;">' + approveBtn + denyBtn + '</div>' +
      '</div>';
    }).join('');
  }).catch(function(){
    el.innerHTML = '<p style="color:#ef4444;font-size:12px;text-align:center;">Failed to load requests</p>';
  });
}

async function approveVehicleRequest(id) {
  if(!confirm('Approve this vehicle request? The vehicle will be assigned to the driver.')) return;
  try {
    var r = await apiFetch('/' + _SLUG + '/api/admin/vehicle-requests/' + id + '/approve', { method: 'PUT' });
    var d = await r.json();
    if(!r.ok) { alert(d.error || 'Failed'); return; }
    loadVehicles();
  } catch(e) { alert('Network error.'); }
}

async function denyVehicleRequest(id) {
  if(!confirm('Deny this request?')) return;
  try {
    var r = await apiFetch('/' + _SLUG + '/api/admin/vehicle-requests/' + id + '/deny', { method: 'PUT' });
    if(!r.ok) { alert('Failed to deny.'); return; }
    loadVehicleRequests();
  } catch(e) { alert('Network error.'); }
}

// â”€â”€ Assign Vehicle to Driver modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
var _assignVehiclePlate = '';
async function openAssignVehicleModal(plate) {
  _assignVehiclePlate = plate;
  // Auto-load staff if not loaded yet (e.g. user hasn't visited Staff tab)
  if (!_staffData || !_staffData.length) {
    try {
      var r = await apiFetch('/' + _SLUG + '/api/admin/staff');
      var d = await r.json();
      _staffData = Array.isArray(d) ? d : (d.staff || []);
    } catch(e) { _staffData = []; }
  }
  var drivers = (_staffData||[]).filter(function(s){return s.role==='Driver' && !s.vehicle_plate;});
  if(!drivers.length) { alert('No unassigned drivers found. All drivers already have vehicles assigned.'); return; }
  var opts = drivers.map(function(d){return '<option value="'+d.staff_id+'">'+esc(d.name)+'</option>';}).join('');
  var html = '<div style="padding:28px 24px 24px;">' +
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">' +
      '<div style="display:flex;align-items:center;gap:10px;">' +
        '<div style="width:38px;height:38px;border-radius:10px;background:linear-gradient(135deg,#3b82f6,#6366f1);display:flex;align-items:center;justify-content:center;"><span class="material-symbols-outlined" style="color:#fff;font-size:20px;">person_add</span></div>' +
        '<div><div style="font-size:15px;font-weight:800;color:#0f172a;">Assign Driver</div><div style="font-size:11px;color:#94a3b8;font-family:monospace;">' + plate + '</div></div>' +
      '</div>' +
      '<button onclick="document.getElementById(\'assign-vehicle-modal\').style.display=\'none\'" style="background:none;border:none;cursor:pointer;color:#94a3b8;font-size:20px;line-height:1;padding:4px;">&#x2715;</button>' +
    '</div>' +
    '<label style="font-size:12px;font-weight:700;color:#475569;display:block;margin-bottom:6px;">Select Driver</label>' +
    '<div style="position:relative;margin-bottom:14px;">' +
      '<select id="assign-driver-select" style="width:100%;padding:12px 40px 12px 14px;border-radius:10px;border:1.5px solid #e2e8f0;background:#fff;color:#0f172a;font-size:13px;font-weight:600;font-family:inherit;outline:none;appearance:none;-webkit-appearance:none;cursor:pointer;box-sizing:border-box;">' + opts + '</select>' +
      '<span class="material-symbols-outlined" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);font-size:20px;color:#64748b;pointer-events:none;">expand_more</span>' +
    '</div>' +
    '<div style="display:flex;align-items:center;gap:6px;padding:10px 12px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;margin-bottom:20px;">' +
      '<span class="material-symbols-outlined" style="font-size:14px;color:#0284c7;">info</span>' +
      '<p style="font-size:11px;color:#0369a1;margin:0;">Driver will receive a notification and must accept the assignment.</p>' +
    '</div>' +
    '<div style="display:flex;gap:10px;">' +
      '<button onclick="document.getElementById(\'assign-vehicle-modal\').style.display=\'none\'" style="flex:1;padding:12px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;background:#fff;color:#64748b;font-family:inherit;">Cancel</button>' +
      '<button onclick="submitAssignVehicle()" style="flex:2;padding:12px;background:linear-gradient(135deg,#3b82f6,#6366f1);color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:6px;"><span class="material-symbols-outlined" style="font-size:16px;">send</span> Send Assignment</button>' +
    '</div>' +
  '</div>';
  var modal = document.getElementById('assign-vehicle-modal');
  if(!modal) {
    modal = document.createElement('div');
    modal.id = 'assign-vehicle-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px);';
    document.body.appendChild(modal);
  }
  modal.innerHTML = '<div style="background:#fff;border-radius:20px;width:100%;max-width:420px;box-shadow:0 24px 64px rgba(0,0,0,0.2);">' + html + '</div>';
  modal.style.display = 'flex';
  modal.onclick = function(e){ if(e.target===modal) document.getElementById('assign-vehicle-modal').style.display='none'; };
}

async function deleteStaff(id, btn) {
  if(!id || !confirm('Remove this staff member? This cannot be undone.')) return;
  btn.disabled = true; btn.style.opacity = '0.4';
  try {
    var r = await apiFetch('/' + _SLUG + '/api/admin/staff/' + id, { method: 'DELETE' });
    var d = await r.json();
    if(!r.ok) { alert(d.error || 'Delete failed.'); btn.disabled = false; btn.style.opacity = '1'; return; }
    loadStaff();
  } catch(e) { alert('Network error.'); btn.disabled = false; btn.style.opacity = '1'; }
}

async function toggleSuspend(id, isSuspended) {
  var actionStr = isSuspended ? 'Activate' : 'Suspend';
  if(!id || !confirm(actionStr + ' this staff member?')) return;
  try {
    var r = await apiFetch('/' + _SLUG + '/api/admin/staff/' + id + '/suspend', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ suspended: !isSuspended })
    });
    var d = await r.json();
    if(!r.ok) { alert(d.error || actionStr + ' failed.'); return; }
    loadStaff();
  } catch(e) { alert('Network error.'); }
}

async function deleteVehicle(id, btn) {
  if(!id || !confirm('Remove this vehicle? This cannot be undone.')) return;
  btn.disabled = true; btn.style.opacity = '0.4';
  try {
    var r = await apiFetch('/' + _SLUG + '/api/admin/vehicles/' + id, { method: 'DELETE' });
    var d = await r.json();
    if(!r.ok) { alert(d.error || 'Delete failed.'); btn.disabled = false; btn.style.opacity = '1'; return; }
    loadVehicles();
  } catch(e) { alert('Network error.'); btn.disabled = false; btn.style.opacity = '1'; }
}

// Hook navigation to load staff/vehicles
var _origGoAdmin = window.go;
window.go = function(id, btn) {
  _origGoAdmin(id, btn);
  if(id === 'staff')    loadStaff();
  if(id === 'vehicles') loadVehicles();
};

// â”€â”€ Staff Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function openStaffModal() {
  document.getElementById('s-name').value = '';
  document.getElementById('s-email').value = '';
  document.getElementById('s-role').value = '';
  document.getElementById('s-license').value = '';
  document.getElementById('staff-modal-err').style.display = 'none';
  document.getElementById('modal-staff').style.display = 'flex';
}
function closeStaffModal() { document.getElementById('modal-staff').style.display = 'none'; }

async function submitAddStaff() {
  var name  = document.getElementById('s-name').value.trim();
  var email = document.getElementById('s-email').value.trim();
  var role  = document.getElementById('s-role').value;
  var lic   = document.getElementById('s-license').value;
  var errEl = document.getElementById('staff-modal-err');
  var btn   = document.getElementById('staff-submit-btn');
  errEl.style.display = 'none';

  if(!name || !email || !role) { errEl.textContent = 'Please fill in all required fields.'; errEl.style.display = 'block'; return; }
  if(!email.includes('@') || !email.includes('.')) { errEl.textContent = 'Please enter a valid email address.'; errEl.style.display = 'block'; return; }

  btn.disabled = true; btn.textContent = 'Adding...';
  try {
    var r = await apiFetch('/' + _SLUG + '/api/admin/staff', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({name, email, role, license_expiry: lic || null})
    });
    var d = await r.json();
    if(!r.ok) throw new Error(d.error || 'Failed to add staff.');
    closeStaffModal();
    loadStaff();
    alert('âœ… Staff added! A welcome email with login credentials has been sent to ' + email + '.');
  } catch(e) { errEl.textContent = e.message; errEl.style.display = 'block'; }
  btn.disabled = false; btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:15px;vertical-align:middle;">person_add</span> Add & Send Email';
}

// â”€â”€ License Review Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
var _licenseStaffId = null;
function openLicenseModal(staffId) {
  _licenseStaffId = staffId;
  var s = _staffData.find(function(x) { return String(x.staff_id || x.id) === String(staffId); });
  if (!s) return alert('Staff not found.');
  document.getElementById('license-driver-name').textContent = (s.name || 'Driver') + ' â€” ' + (s.role || '');
  var statusLabels = { not_uploaded: 'Not Uploaded', pending_review: 'Pending Review', verified: 'Verified', expired: 'Expired' };
  document.getElementById('license-cur-status').textContent = statusLabels[s.license_status] || s.license_status || 'Unknown';
  document.getElementById('license-cur-expiry').textContent = s.license_expiry ? new Date(s.license_expiry).toLocaleDateString() : 'Not set';
  var img = document.getElementById('license-img');
  var noImg = document.getElementById('license-no-img');
  if (s.license_url && s.license_url.length > 10) {
    img.src = s.license_url;
    img.style.display = 'block';
    noImg.style.display = 'none';
  } else {
    img.style.display = 'none';
    noImg.style.display = 'block';
  }
  document.getElementById('modal-license').style.display = 'flex';
}
function closeLicenseModal() { document.getElementById('modal-license').style.display = 'none'; _licenseStaffId = null; }
async function licenseAction(action) {
  if (!_licenseStaffId) return;
  var label = action === 'verify' ? 'approve' : 'reject';
  if (!confirm('Are you sure you want to ' + label + ' this license?')) return;
  try {
    var r = await apiFetch('/' + _SLUG + '/api/admin/staff/' + _licenseStaffId + '/license', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: action })
    });
    var d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Failed.');
    closeLicenseModal();
    loadStaff();
    alert('âœ… ' + d.message);
  } catch (e) { alert('âŒ ' + e.message); }
}

// â”€â”€ Vehicle Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function openVehicleModal() {
  document.getElementById('v-plate').value = '';
  document.getElementById('v-type').value = '';
  document.getElementById('v-model').value = '';
  document.getElementById('v-capacity').value = '';
  document.getElementById('v-status').value = 'Available';
  document.getElementById('v-ownership').value = 'company';
  var imgPreview = document.getElementById('v-image-preview');
  if(imgPreview) { imgPreview.style.display = 'none'; imgPreview.src = ''; }
  window._vehicleImageBase64 = null;
  document.getElementById('vehicle-modal-err').style.display = 'none';
  clearDocUpload();
  document.getElementById('modal-vehicle').style.display = 'flex';
}

function previewVehicleImage(input) {
  if(!input.files || !input.files[0]) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    window._vehicleImageBase64 = e.target.result;
    var preview = document.getElementById('v-image-preview');
    if(preview) { preview.src = e.target.result; preview.style.display = 'block'; }
  };
  reader.readAsDataURL(input.files[0]);
}
function closeVehicleModal() { document.getElementById('modal-vehicle').style.display = 'none'; }

async function submitAddVehicle() {
  var plate    = document.getElementById('v-plate').value.trim();
  var type     = document.getElementById('v-type').value;
  var model    = document.getElementById('v-model').value.trim();
  var capacity = document.getElementById('v-capacity').value;
  var status   = document.getElementById('v-status').value;
  var errEl    = document.getElementById('vehicle-modal-err');
  var btn      = document.getElementById('vehicle-submit-btn');
  errEl.style.display = 'none';

  if(!plate || !type || !capacity || !status) { errEl.textContent = 'All fields are required.'; errEl.style.display = 'block'; return; }
  if(!window._vehicleDocBase64) { errEl.textContent = 'Please upload the CR/OR (Certificate of Registration / Official Receipt) document.'; errEl.style.display = 'block'; return; }

  var ownership = document.getElementById('v-ownership').value;
  btn.disabled = true; btn.textContent = 'Adding...';
  try {
    var r = await apiFetch('/' + _SLUG + '/api/admin/vehicles', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({plate_number: plate, type, model: model || null, capacity_tons: capacity, status, ownership_type: ownership, ownership_doc: window._vehicleDocBase64, image_base64: window._vehicleImageBase64 || null})
    });
    var d = await r.json();
    if(!r.ok) throw new Error(d.error || 'Failed to add vehicle.');
    closeVehicleModal();
    loadVehicles();
    alert('âœ… Vehicle ' + plate.toUpperCase() + ' added successfully!');
  } catch(e) { errEl.textContent = e.message; errEl.style.display = 'block'; }
  btn.disabled = false; btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:15px;vertical-align:middle;">directions_car</span> Add Vehicle';
}

function openUpdateVehicleModal(plate, type, capacity, status, model, ownership, hasImage) {
  document.getElementById('u-v-plate').value = plate;
  document.getElementById('u-v-type').value = type;
  document.getElementById('u-v-model').value = model || '';
  document.getElementById('u-v-capacity').value = capacity;
  document.getElementById('u-v-status').value = status;
  document.getElementById('u-v-ownership').value = ownership || 'company';
  window._updateVehicleImageBase64 = null;
  var imgPrev = document.getElementById('u-v-image-preview');
  // Find existing image from vehicleData
  var existing = (_vehicleData||[]).find(function(v){return v.plate_number===plate;});
  if(existing && existing.image_url) { imgPrev.src = existing.image_url; imgPrev.style.display = 'block'; }
  else { imgPrev.src = ''; imgPrev.style.display = 'none'; }
  document.getElementById('update-vehicle-modal-err').style.display = 'none';
  document.getElementById('modal-update-vehicle').style.display = 'flex';
}
function closeUpdateVehicleModal() { document.getElementById('modal-update-vehicle').style.display = 'none'; }

function previewUpdateVehicleImage(input) {
  if(!input.files || !input.files[0]) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    window._updateVehicleImageBase64 = e.target.result;
    var preview = document.getElementById('u-v-image-preview');
    if(preview) { preview.src = e.target.result; preview.style.display = 'block'; }
  };
  reader.readAsDataURL(input.files[0]);
}

async function submitUpdateVehicle() {
  var plate    = document.getElementById('u-v-plate').value.trim();
  var type     = document.getElementById('u-v-type').value;
  var model    = document.getElementById('u-v-model').value.trim();
  var capacity = document.getElementById('u-v-capacity').value;
  var status   = document.getElementById('u-v-status').value;
  var ownership = document.getElementById('u-v-ownership').value;
  var errEl    = document.getElementById('update-vehicle-modal-err');
  var btn      = document.getElementById('update-vehicle-submit-btn');
  errEl.style.display = 'none';

  if(!type || !capacity || !status) { errEl.textContent = 'All fields are required.'; errEl.style.display = 'block'; return; }

  var payload = {type, model: model || null, capacity_tons: capacity, status, ownership_type: ownership};
  if(window._updateVehicleImageBase64) payload.image_base64 = window._updateVehicleImageBase64;

  btn.disabled = true; btn.textContent = 'Updating...';
  try {
    var r = await apiFetch('/' + _SLUG + '/api/admin/vehicles/' + encodeURIComponent(plate), {
      method: 'PUT', headers: {'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
    var d = await r.json();
    if(!r.ok) throw new Error(d.error || 'Failed to update vehicle.');
    closeUpdateVehicleModal();
    loadVehicles();
  } catch(e) { errEl.textContent = e.message; errEl.style.display = 'block'; }
  btn.disabled = false; btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:15px;vertical-align:middle;">save</span> Save Changes';
}

// â”€â”€ AUDIT LOGS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function loadAuditLogs() {
  var tb = document.getElementById('audit-logs-tbody');
  if(!tb) return;
  tb.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;"><span class="material-symbols-outlined" style="animation:spin 1s linear infinite;">sync</span></td></tr>';
  try {
    var res = await apiFetch('/' + _SLUG + '/api/admin/audit-logs');
    var logs = await res.json();
    if(!logs || !logs.length) {
      tb.innerHTML = '<tr><td colspan="5"><div class="empty"><span class="material-symbols-outlined">history</span><p>No audit logs available</p></div></td></tr>';
      return;
    }
    tb.innerHTML = logs.map(function(l) {
      var ts = new Date(l.created_at).toLocaleString();
      // Use first_name + last_name from the backend if available
      var act = l.actor_name ? esc(l.actor_name) : esc(l.actor || 'system');
      if (!l.actor_name && act.indexOf('@') > 0) {
        var namePart = act.split('@')[0].replace(/[._]/g,' ');
        act = namePart.split(' ').map(function(w){ return w.charAt(0).toUpperCase() + w.slice(1); }).join(' ');
      }
      var type = esc(l.actor_type || '');
      var typeHtml = type === 'superadmin' ? '<span style="color:#d97706;font-weight:700;font-size:10px;background:#fef3c7;padding:2px 6px;border-radius:4px;text-transform:uppercase;">Superadmin</span>' : '<span style="color:#64748b;font-weight:700;font-size:10px;text-transform:uppercase;">' + type + '</span>';
      return '<tr>' +
        '<td style="white-space:nowrap;color:#64748b;font-size:12px;">' + ts + '</td>' +
        '<td><strong>' + act + '</strong></td>' +
        '<td>' + typeHtml + '</td>' +
        '<td><span style="background:#f1f5f9;color:#334155;padding:3px 8px;border-radius:6px;font-size:11px;font-family:\'DM Mono\',monospace;font-weight:600;">' + esc(l.action) + '</span></td>' +
        '<td>' + esc(l.target || 'â€”') + '</td>' +
      '</tr>';
    }).join('');
  } catch (e) {
    tb.innerHTML = '<tr><td colspan="6"><div class="empty" style="color:#dc2626;"><span class="material-symbols-outlined">error</span><p>Failed to load audit logs.</p></div></td></tr>';
  }
}
// â”€â”€ PAYMENTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function loadPayments() {
  var tb = document.querySelector('#s-payments .tbl-wrap tbody');
  if(tb) tb.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:20px;"><span class="material-symbols-outlined" style="animation:spin 1s linear infinite;">sync</span></td></tr>';
  try {
    var res = await apiFetch('/' + _SLUG + '/api/admin/payments');
    var d = await res.json();
    if (!d || !d.payments) throw new Error('Invalid response');

    // Update stat cards
    var rev = parseFloat(d.total_revenue || 0);
    var paidCount = d.payments.filter(function(p){return p.status==='Paid';}).length;
    var pendingCount = parseInt(d.pending_count || 0);
    var overdueCount = d.payments.filter(function(p){return p.status==='Overdue';}).length;

    // Compute estimated expenses: use server-computed values
    var totalKm = parseFloat(d.total_distance || 0);
    var expenses = parseFloat(d.total_expenses || 0);
    var netProfit = rev - expenses;

    var fmt = function(v) { return '\u20B1' + Math.abs(v).toLocaleString('en-PH', {minimumFractionDigits:2, maximumFractionDigits:2}); };

    // Gross Revenue
    var el;
    el = document.getElementById('pay-gross');
    if(el) el.textContent = fmt(rev);
    el = document.getElementById('pay-gross-note');
    if(el) el.textContent = paidCount + ' paid invoices';

    // Est. Expenses
    el = document.getElementById('pay-expenses');
    if(el) el.textContent = fmt(expenses);

    // Net Profit
    el = document.getElementById('pay-net');
    if(el) { el.textContent = (netProfit < 0 ? '-' : '') + fmt(netProfit); el.style.color = netProfit >= 0 ? '#16a34a' : '#dc2626'; }
    el = document.getElementById('pay-net-note');
    if(el) el.textContent = totalKm > 0 ? totalKm.toFixed(1) + ' km total distance' : 'Revenue âˆ’ Expenses';

    // Pending
    el = document.getElementById('pay-pending');
    if(el) el.textContent = pendingCount;
    el = document.getElementById('pay-pending-note');
    if(el) el.textContent = pendingCount ? pendingCount + ' awaiting payment' : 'All cleared';

    // Overdue
    el = document.getElementById('pay-overdue');
    if(el) el.textContent = overdueCount;
    el = document.getElementById('pay-overdue-note');
    if(el) el.textContent = overdueCount ? overdueCount + ' past due' : 'No data yet';

    renderPayments(d.payments);
  } catch(e) {
    if(tb) tb.innerHTML = '<tr><td colspan="10"><div class="empty" style="color:#dc2626;"><span class="material-symbols-outlined">error</span><p>Failed to load payments.</p></div></td></tr>';
  }
}

function renderPayments(list) {
  var tb = document.querySelector('#s-payments .tbl-wrap tbody');
  if(!tb) return;
  if(!list || !list.length) {
    tb.innerHTML = '<tr><td colspan="9"><div class="empty"><span class="material-symbols-outlined">payments</span><p>No payment records yet</p></div></td></tr>';
    return;
  }
  var statusCl = {'Paid':'b-delivered','Pending':'b-awaiting','Overdue':'b-declined','AwaitingAdmin':'b-pending'};
  tb.innerHTML = list.map(function(p) {
    var customer = (p.customer_first || p.customer_last)
      ? esc((p.customer_first + ' ' + p.customer_last).trim())
      : esc(p.receiver_name || 'â€”');
    var amount = p.total_amount ? '\u20B1' + parseFloat(p.total_amount).toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2}) : 'â€”';
    var method = p.payment_method || '';
    var methodLabels = {'gcash':'GCash','card':'Card','paymaya':'PayMaya','grab_pay':'GrabPay','billease':'BillEase','dob':'Online Banking'};
    if (method && methodLabels[method.toLowerCase()]) method = methodLabels[method.toLowerCase()];
    else if (method) method = method.charAt(0).toUpperCase() + method.slice(1);
    if (!method && p.paymongo_checkout_id) method = 'PayMongo';
    method = esc(method || 'â€”');
    var ref = esc(p.reference_code || p.paymongo_payment_id || p.paymongo_checkout_id || 'â€”');
    var confirmed = p.admin_confirmed ? '<span style="color:#16a34a;font-size:12px;">&#10003; Yes</span>' : '<span style="color:#94a3b8;font-size:12px;">â€”</span>';
    var st = p.status || 'Pending';
    var stCl = statusCl[st] || 'b-pending';
    var date = p.paid_at ? new Date(p.paid_at).toLocaleString(undefined, {year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) : (p.created_at ? new Date(p.created_at).toLocaleString(undefined, {year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) : 'â€”');
    var confirmBtn = (st !== 'Paid')
      ? '<button onclick="confirmPayment(' + p.invoice_id + ',this)" style="font-size:11px;padding:3px 10px;border:1.5px solid #0f2235;border-radius:6px;background:none;cursor:pointer;font-weight:600;color:#0f2235;" title="Mark as Paid">Confirm</button>'
      : '';
    return '<tr>' +
      '<td><strong style="font-family:monospace;">#' + esc(String(p.invoice_id||'')) + '</strong></td>' +
      '<td><strong>' + esc(p.delivery_number||'â€”') + '</strong></td>' +
      '<td>' + customer + '</td>' +
      '<td><strong>' + amount + '</strong></td>' +
      '<td>' + method + '</td>' +
      '<td style="font-family:monospace;font-size:11px;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + ref + '">' + ref + '</td>' +
      '<td>' + confirmed + '</td>' +
      '<td><span class="badge ' + stCl + '">' + esc(st) + '</span></td>' +
      '<td>' + date + '</td>' +
      '<td>' + confirmBtn + '</td>' +
    '</tr>';
  }).join('');
}

async function confirmPayment(invoiceId, btn) {
  if(!confirm('Mark invoice #' + invoiceId + ' as Paid?')) return;
  btn.disabled = true; btn.textContent = 'Saving...';
  try {
    var r = await apiFetch('/' + _SLUG + '/api/admin/payments/' + invoiceId + '/confirm', { method: 'POST' });
    var d = await r.json();
    if(!r.ok) throw new Error(d.error || 'Failed');
    loadPayments();
  } catch(e) { alert(e.message); btn.disabled=false; btn.textContent='Confirm'; }
}
// â”€â”€ Subscription â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function loadSubscription() {
  var plans = {
    'startup':    { label: 'Padala',       price: 1499,  desc: 'Up to 10 riders / drivers, local deliveries' },
    'enterprise': { label: 'Negosyo',      price: 4999,  desc: 'Unlimited riders & users, live tracking' },
    'global':     { label: 'Korporasyon',  price: 14999, desc: 'Full platform, dedicated manager, data export' }
  };

  var nameEl = document.getElementById('sub-plan-name');
  var descEl = document.getElementById('sub-plan-desc');
  var priceEl = document.getElementById('sub-plan-price');
  var nextEl = document.getElementById('sub-next-billing');
  var daysEl = document.getElementById('sub-days-left');
  var statusEl = document.getElementById('sub-status');
  var sinceEl = document.getElementById('sub-since');
  var tbody = document.getElementById('sub-billing-tbody');

  try {
    var res = await apiFetch('/' + _SLUG + '/api/admin/subscription');
    var d = await res.json();
    if (!d.ok) throw new Error(d.error || 'Failed');

    var planKey = (d.plan || 'startup').toLowerCase();
    var plan = plans[planKey] || plans['startup'];
    var tenantCreated = d.tenant_created_at ? new Date(d.tenant_created_at) : new Date();
    var now = new Date();

    // Populate plan info
    if (nameEl) nameEl.textContent = plan.label;
    if (descEl) descEl.textContent = plan.desc;
    if (priceEl) priceEl.textContent = '\u20b1' + plan.price.toLocaleString() + '.00';

    // Calculate next billing based on monthly cycle from creation
    var nextBilling = new Date(tenantCreated);
    while (nextBilling <= now) {
      nextBilling.setMonth(nextBilling.getMonth() + 1);
    }
    if (nextEl) nextEl.textContent = nextBilling.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    var daysRemaining = Math.ceil((nextBilling - now) / (1000 * 60 * 60 * 24));
    if (daysEl) {
      if (daysRemaining <= 3) {
        daysEl.innerHTML = '<span style="color:#ef4444;font-weight:700;">' + daysRemaining + ' days remaining \u2014 payment due soon</span>';
      } else {
        daysEl.textContent = daysRemaining + ' days remaining';
      }
    }

    if (statusEl) {
      statusEl.textContent = 'Active';
      statusEl.style.color = '#16a34a';
    }
    if (sinceEl) {
      sinceEl.textContent = 'Since ' + tenantCreated.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    }

    // Show pending downgrade notice
    var pendingContainer = document.getElementById('sub-pending-downgrade');
    if (pendingContainer && d.pending_downgrade) {
      var targetPlan = plans[d.pending_downgrade] ? plans[d.pending_downgrade].label : d.pending_downgrade;
      var effDate = d.downgrade_effective_date ? new Date(d.downgrade_effective_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'next billing cycle';
      pendingContainer.style.display = 'block';
      pendingContainer.innerHTML = '<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:16px 20px;display:flex;align-items:center;justify-content:space-between;gap:12px;">' +
        '<div style="display:flex;align-items:center;gap:10px;">' +
          '<span class="material-symbols-outlined" style="font-size:20px;color:#f97316;">schedule</span>' +
          '<div><div style="font-size:13px;font-weight:700;color:#9a3412;">Downgrade Scheduled</div>' +
          '<div style="font-size:12px;color:#c2410c;">Your plan will change to <strong>' + esc(targetPlan) + '</strong> on ' + effDate + '</div></div>' +
        '</div>' +
        '<button onclick="cancelDowngrade(this)" style="padding:8px 16px;background:#fff;border:1.5px solid #fed7aa;border-radius:8px;font-size:12px;font-weight:700;color:#ea580c;cursor:pointer;font-family:inherit;white-space:nowrap;transition:all .15s;" onmouseover="this.style.background=\'#fef2f2\';this.style.borderColor=\'#ef4444\';this.style.color=\'#dc2626\';" onmouseout="this.style.background=\'#fff\';this.style.borderColor=\'#fed7aa\';this.style.color=\'#ea580c\';">Cancel Downgrade</button>' +
      '</div>';
    }

    // Billing history from SUBSCRIPTION_PAYMENT table
    if (!tbody) return;
    var payments = d.payments || [];
    if (!payments.length) {
      tbody.innerHTML = '<tr><td colspan="4"><div class="empty"><span class="material-symbols-outlined">event_repeat</span><p>No subscription payments recorded yet</p></div></td></tr>';
      return;
    }

    tbody.innerHTML = payments.map(function(p) {
      var date = p.created_at ? new Date(p.created_at).toLocaleString(undefined, {year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) : '\u2014';
      var planLabel = (plans[p.plan] ? plans[p.plan].label : (p.plan || '').charAt(0).toUpperCase() + (p.plan || '').slice(1)) + ' Plan';
      var amount = '\u20b1' + parseFloat(p.amount || 0).toLocaleString('en-PH', {minimumFractionDigits:2, maximumFractionDigits:2});
      var st = (p.status || '').toLowerCase() === 'paid' ? 'Paid' : (p.status || 'Pending');
      var stCl = st === 'Paid' ? 'b-delivered' : 'b-pending';
      return '<tr>' +
        '<td>' + date + '</td>' +
        '<td>' + esc(planLabel) + '</td>' +
        '<td><strong>' + amount + '</strong></td>' +
        '<td><span class="badge ' + stCl + '">' + esc(st) + '</span></td>' +
      '</tr>';
    }).join('');

  } catch(e) {
    // Fallback to __TENANT__ data if API fails
    var t = window.__TENANT__ || {};
    var planKey = (t.plan || 'startup').toLowerCase();
    var plan = plans[planKey] || plans['startup'];
    if (nameEl) nameEl.textContent = plan.label;
    if (descEl) descEl.textContent = plan.desc;
    if (priceEl) priceEl.textContent = '\u20b1' + plan.price.toLocaleString() + '.00';
    if (statusEl) { statusEl.textContent = 'Active'; statusEl.style.color = '#16a34a'; }
    if (tbody) tbody.innerHTML = '<tr><td colspan="4"><div class="empty"><span class="material-symbols-outlined">event_repeat</span><p>Could not load billing history</p></div></td></tr>';
  }
}

async function cancelDowngrade(btn) {
  if (!confirm('Cancel the pending downgrade? Your current plan will remain active.')) return;
  btn.disabled = true;
  btn.textContent = 'Cancelling...';
  try {
    var r = await apiFetch('/' + _SLUG + '/api/admin/cancel-downgrade', {
      method: 'POST',
      headers: {'Content-Type':'application/json'}
    });
    var d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Failed');
    alert('âœ“ ' + d.message);
    // Hide the notice and reload subscription
    var container = document.getElementById('sub-pending-downgrade');
    if (container) container.style.display = 'none';
    loadSubscription();
  } catch(e) {
    alert('Error: ' + e.message);
    btn.disabled = false;
    btn.textContent = 'Cancel Downgrade';
  }
}

// â”€â”€ Proof of Delivery â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function loadPODs() {
  var tb = document.querySelector('#s-pod .tbl-wrap tbody');
  if(!tb) return;
  tb.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;"><span class="material-symbols-outlined" style="animation:spin 1s linear infinite;">sync</span></td></tr>';
  try {
    var res = await apiFetch('/' + _SLUG + '/api/admin/pods');
    var d = await res.json();
    var pods = d.pods || [];
    if(!pods.length) {
      tb.innerHTML = '<tr><td colspan="6"><div class="empty"><span class="material-symbols-outlined">task</span><p>No PODs yet</p></div></td></tr>';
      return;
    }
    tb.innerHTML = pods.map(function(p) {
      var geo = (p.latitude && p.longitude) ? parseFloat(p.latitude).toFixed(4) + ', ' + parseFloat(p.longitude).toFixed(4) : 'â€”';
      var ts = p.created_at ? new Date(p.created_at).toLocaleString() : 'â€”';
      var type = esc(p.capture_type || p.type || 'Photo');
      var media = p.photo ? '<img src="' + p.photo + '" style="width:40px;height:40px;object-fit:cover;border-radius:6px;cursor:pointer;" onclick="window.open(this.src)" />' : (p.signature ? '<img src="' + p.signature + '" style="width:40px;height:40px;object-fit:cover;border-radius:6px;cursor:pointer;" onclick="window.open(this.src)" />' : 'â€”');
      return '<tr>' +
        '<td><strong>' + esc(String(p.pod_id || p.id || '')) + '</strong></td>' +
        '<td><strong>' + esc(p.delivery_number || 'â€”') + '</strong></td>' +
        '<td>' + type + '</td>' +
        '<td style="font-family:monospace;font-size:11px;">' + geo + '</td>' +
        '<td>' + ts + '</td>' +
        '<td>' + media + '</td>' +
      '</tr>';
    }).join('');
  } catch(e) {
    tb.innerHTML = '<tr><td colspan="6"><div class="empty" style="color:#dc2626;"><span class="material-symbols-outlined">error</span><p>Failed to load PODs</p></div></td></tr>';
  }
}
loadPODs();

