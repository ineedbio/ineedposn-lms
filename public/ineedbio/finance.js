// INeedBio Finance & Multi-Role Accounting Extension — Standalone Dedicated Page
(function () {
  'use strict';

  var currentToken = '';
  var currentUser = null;
  var currentSubject = ''; // '' for all, or 'bio' | 'chem' | 'phys' | 'math'
  var activeSubTab = 'incomes'; // 'incomes' | 'expenses'
  var cachedCourses = [];
  var isRenderingPage = false;

  // Intercept fetch to track session token & current user
  var _origFetch = window.fetch;
  window.fetch = async function () {
    var args = Array.prototype.slice.call(arguments);
    try {
      if (args[1] && args[1].body) {
        var p = JSON.parse(args[1].body);
        if (p && p.token) currentToken = p.token;
      }
    } catch (e) {}
    var res = await _origFetch.apply(this, args);
    try {
      var clone = res.clone();
      var data = await clone.json();
      if (data && data.data && data.data.token) currentToken = data.data.token;
      if (data && data.data && data.data.user) {
        currentUser = data.data.user;
        if (currentUser.instructor_subject) currentSubject = currentUser.instructor_subject;
      }
    } catch (e) {}
    return res;
  };

  // Extract token from storage if not captured by fetch yet
  function ensureToken() {
    if (currentToken) return currentToken;
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        var v = localStorage.getItem(k);
        if (!v) continue;
        if (v.length === 24 && !/[^a-zA-Z0-9]/.test(v)) {
          currentToken = v;
          break;
        }
        try {
          var obj = JSON.parse(v);
          if (obj && obj.token) {
            currentToken = obj.token;
            if (obj.user) {
              currentUser = obj.user;
              if (currentUser.instructor_subject) currentSubject = currentUser.instructor_subject;
            }
            break;
          }
        } catch (e) {}
      }
    } catch (e) {}
    return currentToken;
  }

  async function api(action, data) {
    var url = window.INEEDBIO_API_URL || '/api/ib';
    var res = await _origFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: action, data: data || {}, token: ensureToken() })
    });
    var json = await res.json();
    if (!json.ok) throw new Error(json.message || json.error || 'เกิดข้อผิดพลาด');
    return json.data;
  }

  function baht(num) {
    var n = Number(num) || 0;
    return '฿' + n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function fmtDate(isoStr) {
    if (!isoStr) return '-';
    var d = new Date(isoStr);
    return isNaN(d.getTime()) ? isoStr : d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  // Inject CSS styles matching native INeedBio design tokens
  var style = document.createElement('style');
  style.textContent = `
    .ib-finance-page { min-height: 100vh; background: var(--bg); color: var(--ink); display: flex; flex-direction: column; font-family: var(--sans); }
    .ib-finance-header { border-bottom: 1px solid var(--line); background: color-mix(in srgb, var(--bg) 92%, transparent); backdrop-filter: saturate(1.4) blur(14px); -webkit-backdrop-filter: saturate(1.4) blur(14px); position: sticky; top: 0; z-index: 50; }
    .ib-finance-hdr-inner { max-width: 1140px; margin: 0 auto; padding: 14px 20px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px; }
    .ib-finance-brand-wrap { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
    .ib-finance-title-box { display: flex; flex-direction: column; gap: 2px; }
    .ib-finance-actions-right { display: flex; align-items: center; gap: 12px; }
    
    .ib-finance-content-wrap { max-width: 1140px; width: 100%; margin: 0 auto; padding: 28px 20px 80px; display: flex; flex-direction: column; gap: 24px; box-sizing: border-box; }
    .ib-stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 18px; }
    .ib-stat-card { background: var(--bg); border: 1px solid var(--line); border-radius: 20px; padding: 24px; display: flex; flex-direction: column; gap: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.02); }
    .ib-stat-card.income { border-left: 6px solid #16a34a; }
    .ib-stat-card.expense { border-left: 6px solid #dc2626; }
    .ib-stat-card.profit { border-left: 6px solid #2563eb; }
    .ib-stat-title { font-size: 13.5px; color: var(--muted); font-weight: 600; }
    .ib-stat-val { font-size: 28px; font-weight: 800; color: var(--ink); letter-spacing: -0.02em; }
    .ib-stat-sub { font-size: 12.5px; color: var(--ink2); }
    
    .ib-toolbar { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 14px; margin-top: 8px; }
    .ib-subnav { display: flex; gap: 4px; background: var(--bg3); padding: 5px; border-radius: 999px; }
    .ib-subnav button { padding: 8px 20px; border: none; border-radius: 999px; background: transparent; cursor: pointer; font-size: 14px; font-weight: 600; color: var(--ink2); transition: all .15s; font-family: inherit; }
    .ib-subnav button.active { background: var(--bg) !important; color: var(--ink) !important; box-shadow: 0 2px 8px rgba(0,0,0,.08); }
    
    .ib-table { width: 100%; border-collapse: separate; border-spacing: 0; background: var(--bg); border: 1px solid var(--line); border-radius: 20px; overflow: hidden; font-size: 13.5px; }
    .ib-table th { background: var(--bg2); padding: 14px 18px; text-align: left; font-weight: 700; color: var(--ink2); border-bottom: 1px solid var(--line); }
    .ib-table td { padding: 16px 18px; border-bottom: 1px solid var(--line); vertical-align: middle; color: var(--ink); }
    .ib-table tr:last-child td { border-bottom: none; }
    .ib-table tr:hover td { background: var(--bg2); }
    
    .ib-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 9px 20px; border-radius: 999px; font-size: 14px; font-weight: 600; border: 1px solid transparent; cursor: pointer; transition: all .15s; text-decoration: none; font-family: inherit; }
    .ib-btn-primary { background: var(--acc) !important; color: var(--on-acc) !important; border-color: var(--acc); box-shadow: 0 2px 10px rgba(0,0,0,.1); }
    .ib-btn-primary:hover { opacity: .9; transform: translateY(-1px); }
    .ib-btn-outline { background: var(--bg) !important; border: 1px solid var(--line) !important; color: var(--ink) !important; }
    .ib-btn-outline:hover { background: var(--bg2) !important; }
    .ib-btn-sm { padding: 5px 14px; font-size: 12.5px; }
    
    .ib-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.65); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); z-index: 99999; display: flex; align-items: center; justify-content: center; padding: 20px; overflow-y: auto; }
    .ib-modal-card { background: var(--bg) !important; color: var(--ink) !important; border: 1px solid var(--line); border-radius: 22px; max-width: 520px; width: 100%; padding: 28px; box-shadow: 0 24px 60px rgba(0,0,0,0.4); display: flex; flex-direction: column; gap: 16px; position: relative; }
    .ib-field { display: flex; flex-direction: column; gap: 6px; }
    .ib-field label { font-size: 13px; font-weight: 700; color: var(--ink2); }
    .ib-field input, .ib-field select, .ib-field textarea { padding: 11px 14px; border-radius: 12px; border: 1px solid var(--line); background: var(--bg2) !important; color: var(--ink) !important; font-family: inherit; font-size: 14px; outline: none; transition: border-color .15s, box-shadow .15s; }
    .ib-field input:focus, .ib-field select:focus, .ib-field textarea:focus { border-color: var(--acc); box-shadow: 0 0 0 3px var(--acc-soft); }
    
    .ib-tag { display: inline-block; padding: 3px 10px; border-radius: 6px; font-size: 12px; font-weight: 700; }
    .ib-tag-chem { background: #ffedd5; color: #c2410c; }
    .ib-tag-bio { background: #dcfce7; color: #15803d; }
    .ib-tag-phys { background: #e0f2fe; color: #0369a1; }
    .ib-tag-math { background: #f3e8ff; color: #7e22ce; }

    /* Admin Sidebar Link */
    .ib-finance-nav-link {
      cursor: pointer !important;
      text-decoration: none !important;
      transition: all .15s !important;
    }
    .ib-finance-nav-link:hover {
      opacity: 0.9 !important;
    }
  `;
  document.head.appendChild(style);

  // Router loop supporting both Next.js pathname and hash routes
  function checkRoute() {
    var h = window.location.hash || '';
    var path = window.location.pathname || '';
    var isFinance = (h === '#/finance' || h.indexOf('#/finance?') === 0 || path === '/finance' || path.indexOf('/finance/') === 0);
    var isAdmin = (h.indexOf('#/admin') === 0 || path === '/admin' || path.indexOf('/admin/') === 0);

    if (isFinance) {
      if (!isRenderingPage) renderStandaloneFinancePage();
    } else {
      isRenderingPage = false;
      if (isAdmin) {
        setupAdminSidebarLink();
      }
    }
  }

  window.addEventListener('hashchange', checkRoute);
  window.addEventListener('popstate', checkRoute);
  setInterval(checkRoute, 300);

  // Add clean link to Admin Sidebar (supports Next.js AdminSidebar and legacy navigation)
  function setupAdminSidebarLink() {
    ensureToken();
    if (document.querySelector('.ib-finance-nav-link')) return;

    // 1. Prefer placing right after payment/requests tab (คำขอเข้าเรียน)
    var paymentLink = document.querySelector('a[href*="/admin/payments"], a[href*="payment"], a[href*="คำขอ"]');
    var targetNeighbor = null;
    var nav = null;

    if (paymentLink) {
      nav = paymentLink.parentElement;
      targetNeighbor = paymentLink;
    }

    // 2. If not found, look for any admin sidebar link (ภาพรวม, คอร์ส, etc.)
    if (!nav) {
      var allAdminLinks = document.querySelectorAll('aside a, nav a, a[href^="/admin"], a[href*="/admin"]');
      for (var i = 0; i < allAdminLinks.length; i++) {
        var t = allAdminLinks[i].textContent || '';
        if (t.indexOf('คำขอ') >= 0 || t.indexOf('ภาพรวม') >= 0 || t.indexOf('คอร์ส') >= 0 || t.indexOf('นักเรียน') >= 0 || t.indexOf('ตั้งค่า') >= 0) {
          nav = allAdminLinks[i].parentElement;
          targetNeighbor = allAdminLinks[i];
          break;
        }
      }
    }

    // 3. Fallback to standard nav selectors
    if (!nav) {
      nav = document.querySelector('aside nav, nav.ad-nav, nav.tabs, .ad-tabs, [role="tablist"], .adnav, aside, .sidebar nav');
    }

    if (!nav) return;

    // Filter instructor subject tabs if instructor
    if (currentUser && currentUser.instructor_subject) {
      var items = nav.children;
      for (var j = 0; j < items.length; j++) {
        var text = items[j].textContent || '';
        if (text.indexOf('ผู้ใช้') >= 0 || text.indexOf('ตั้งค่า') >= 0) {
          items[j].style.display = 'none';
        }
      }
    }

    var sample = targetNeighbor || nav.querySelector('a, button') || nav.children[0];
    var a = document.createElement('a');
    a.className = (sample && sample.className ? sample.className : 'tab') + ' ib-finance-nav-link';
    a.href = '#/finance';
    a.innerHTML = '<span>💰 บัญชีรายรับ-รายจ่าย</span><span style="font-size: 11px; opacity: 0.7;">↗</span>';
    a.style.cursor = 'pointer';

    a.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      window.location.hash = '#/finance';
      renderStandaloneFinancePage();
    }, true);

    if (targetNeighbor && targetNeighbor.insertAdjacentElement) {
      targetNeighbor.insertAdjacentElement('afterend', a);
    } else {
      nav.appendChild(a);
    }
  }

  // Render the dedicated Full Standalone Finance Page
  async function renderStandaloneFinancePage() {
    isRenderingPage = true;
    var app = document.getElementById('app');
    if (!app) return;

    var splash = document.getElementById('splash');
    if (splash) splash.style.display = 'none';

    app.innerHTML = `
      <div class="ib-finance-page">
        <header class="ib-finance-header">
          <div class="ib-finance-hdr-inner">
            <div class="ib-finance-brand-wrap">
              <a href="#/admin" id="btn-back-to-admin" class="ib-btn ib-btn-outline ib-btn-sm">
                ← กลับหน้าหลักหลังบ้าน
              </a>
              <div class="ib-finance-title-box">
                <h1 style="font-size: 20px; font-weight: 800; margin: 0; display: flex; align-items: center; gap: 8px;">
                  💰 บัญชีรายรับ-รายจ่าย
                </h1>
              </div>
            </div>

            <div class="ib-finance-actions-right">
              <div id="ib-subj-wrap"></div>
              <button type="button" id="btn-add-exp-top" class="ib-btn ib-btn-primary ib-btn-sm">
                + บันทึกรายจ่าย
              </button>
            </div>
          </div>
        </header>

        <main class="ib-finance-content-wrap">
          <div class="ib-stat-grid">
            <div class="ib-stat-card income">
              <span class="ib-stat-title">รายรับรวม (Approved Incomes)</span>
              <span class="ib-stat-val" id="val-income" style="color: #16a34a;">...</span>
              <span class="ib-stat-sub" id="sub-income">กำลังโหลด...</span>
            </div>
            <div class="ib-stat-card expense">
              <span class="ib-stat-title">รายจ่ายรวม (Total Expenses)</span>
              <span class="ib-stat-val" id="val-expense" style="color: #dc2626;">...</span>
              <span class="ib-stat-sub" id="sub-expense">กำลังโหลด...</span>
            </div>
            <div class="ib-stat-card profit">
              <span class="ib-stat-title">กำไรสุทธิ (Net Profit)</span>
              <span class="ib-stat-val" id="val-profit">...</span>
              <span class="ib-stat-sub">คำนวณจากรายรับหักลบรายจ่าย</span>
            </div>
          </div>

          <div class="ib-toolbar">
            <div class="ib-subnav">
              <button type="button" id="sub-btn-inc" class="${activeSubTab === 'incomes' ? 'active' : ''}">
                รายรับ
              </button>
              <button type="button" id="sub-btn-exp" class="${activeSubTab === 'expenses' ? 'active' : ''}">
                รายจ่าย
              </button>
            </div>
            <button type="button" id="btn-add-exp-bar" class="ib-btn ib-btn-primary ib-btn-sm">
              + บันทึกรายจ่ายใหม่
            </button>
          </div>

          <div id="ib-table-box">
            <div style="padding: 60px; text-align: center; color: var(--muted);">กำลังโหลดข้อมูลการเงินและบัญชี...</div>
          </div>
        </main>
      </div>
    `;

    var backBtn = document.getElementById('btn-back-to-admin');
    if (backBtn) {
      backBtn.onclick = function (e) {
        e.preventDefault();
        window.location.hash = '#/admin';
        window.location.reload();
      };
    }

    document.getElementById('sub-btn-inc').onclick = function () {
      activeSubTab = 'incomes';
      loadFinanceData();
    };
    document.getElementById('sub-btn-exp').onclick = function () {
      activeSubTab = 'expenses';
      loadFinanceData();
    };
    document.getElementById('btn-add-exp-top').onclick = function () {
      openExpenseModal();
    };
    document.getElementById('btn-add-exp-bar').onclick = function () {
      openExpenseModal();
    };

    await loadFinanceData();
  }

  async function loadFinanceData() {
    var tableBox = document.getElementById('ib-table-box');
    if (!tableBox) return;

    try {
      if (!cachedCourses.length) {
        cachedCourses = (await api('admin.courses')) || [];
      }
      var summary = await api('admin.finance.summary', { subject: currentSubject });
      var incomes = activeSubTab === 'incomes' ? await api('admin.finance.incomes', { subject: currentSubject }) : [];
      var expenses = activeSubTab === 'expenses' ? await api('admin.finance.expenses', { subject: currentSubject }) : [];

      // Update Header Subject Selector
      var subjWrap = document.getElementById('ib-subj-wrap');
      var isSuper = !currentUser || !currentUser.instructor_subject;
      if (subjWrap) {
        if (isSuper) {
          subjWrap.innerHTML = `
            <select id="ib-subject-selector" class="ib-btn ib-btn-outline ib-btn-sm" style="font-weight: 600;">
              <option value="" ${currentSubject === '' ? 'selected' : ''}>ทุกวิชา</option>
              <option value="bio" ${currentSubject === 'bio' ? 'selected' : ''}>ชีววิทยา</option>
              <option value="chem" ${currentSubject === 'chem' ? 'selected' : ''}>เคมี</option>
              <option value="phys" ${currentSubject === 'phys' ? 'selected' : ''}>ฟิสิกส์</option>
              <option value="math" ${currentSubject === 'math' ? 'selected' : ''}>คณิตศาสตร์</option>
            </select>
          `;
          var sel = document.getElementById('ib-subject-selector');
          if (sel) {
            sel.onchange = function () {
              currentSubject = sel.value;
              loadFinanceData();
            };
          }
        } else {
          subjWrap.innerHTML = `
            <span class="ib-tag ib-tag-${currentSubject}" style="font-size: 13px; padding: 5px 12px;">
              วิชา: ${summary.subject_name || currentSubject}
            </span>
          `;
        }
      }

      // Update Stats
      var valInc = document.getElementById('val-income');
      var subInc = document.getElementById('sub-income');
      var valExp = document.getElementById('val-expense');
      var subExp = document.getElementById('sub-expense');
      var valPro = document.getElementById('val-profit');
      var btnInc = document.getElementById('sub-btn-inc');
      var btnExp = document.getElementById('sub-btn-exp');

      if (valInc) valInc.textContent = baht(summary.total_income);
      if (subInc) subInc.textContent = 'จากนักเรียนที่อนุมัติแล้ว ' + summary.income_count + ' รายการ';
      if (valExp) valExp.textContent = baht(summary.total_expense);
      if (subExp) subExp.textContent = 'บันทึกค่าใช้จ่าย ' + summary.expense_count + ' รายการ';
      if (valPro) {
        valPro.textContent = baht(summary.net_profit);
        valPro.style.color = summary.net_profit >= 0 ? '#2563eb' : '#dc2626';
      }
      if (btnInc) {
        btnInc.textContent = 'รายรับ (' + summary.income_count + ')';
        btnInc.className = activeSubTab === 'incomes' ? 'active' : '';
      }
      if (btnExp) {
        btnExp.textContent = 'รายจ่าย (' + summary.expense_count + ')';
        btnExp.className = activeSubTab === 'expenses' ? 'active' : '';
      }

      // Render Tables
      if (activeSubTab === 'incomes') {
        tableBox.innerHTML = renderIncomesTable(incomes);
      } else {
        tableBox.innerHTML = renderExpensesTable(expenses);
      }

      attachTableEvents(tableBox);

    } catch (err) {
      if (tableBox) {
        tableBox.innerHTML = '<div style="padding: 40px; color: #dc2626; text-align: center;">เกิดข้อผิดพลาด: ' + err.message + '</div>';
      }
    }
  }

  function renderIncomesTable(rows) {
    if (!rows.length) {
      return '<div style="padding: 60px; text-align: center; color: var(--muted); background: var(--bg); border: 1px solid var(--line); border-radius: 20px;">ไม่มีรายการรายรับในหมวดหมู่นี้</div>';
    }
    return `
      <table class="ib-table">
        <thead>
          <tr>
            <th>วันที่อนุมัติ</th>
            <th>ผู้เรียน</th>
            <th>คอร์สเรียน</th>
            <th>วิชา</th>
            <th>ยอดเงิน</th>
            <th>สลิป</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(function (r) {
            return `
              <tr>
                <td>${fmtDate(r.reviewed_at || r.created_at)}</td>
                <td>
                  <strong>${r.student_name}</strong> ${r.student_nickname ? '(' + r.student_nickname + ')' : ''}
                  <div style="font-size: 11.5px; color: var(--muted);">${r.student_email}</div>
                </td>
                <td><strong>${r.course_title}</strong></td>
                <td><span class="ib-tag ib-tag-${r.subject_key}">${r.subject_name || r.subject_key}</span></td>
                <td style="font-weight: 700; color: #16a34a; font-size: 14.5px;">${baht(r.amount)}</td>
                <td>
                  ${r.has_slip ? `
                    <button type="button" class="ib-btn ib-btn-outline ib-btn-sm btn-view-slip" data-id="${r.payment_id}" data-type="income">
                      📄 ดูสลิป
                    </button>
                  ` : '<span style="color: var(--muted);">-</span>'}
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  }

  function renderExpensesTable(rows) {
    if (!rows.length) {
      return '<div style="padding: 60px; text-align: center; color: var(--muted); background: var(--bg); border: 1px solid var(--line); border-radius: 20px;">ยังไม่มีการบันทึกรายจ่าย</div>';
    }
    return `
      <table class="ib-table">
        <thead>
          <tr>
            <th>วันที่</th>
            <th>รายการรายจ่าย</th>
            <th>หมวดหมู่</th>
            <th>วิชา/คอร์ส</th>
            <th>ยอดเงิน</th>
            <th>ผู้บันทึก</th>
            <th>สลิป</th>
            <th>จัดการ</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(function (r) {
            return `
              <tr>
                <td>${fmtDate(r.date)}</td>
                <td>
                  <strong>${r.title}</strong>
                  ${r.note ? `<div style="font-size: 11.5px; color: var(--muted);">${r.note}</div>` : ''}
                </td>
                <td><span style="background: var(--bg3); padding: 3px 10px; border-radius: 8px; font-size: 12px; font-weight: 600;">${r.category}</span></td>
                <td>
                  ${r.course_title ? `<div style="font-size: 12px;">${r.course_title}</div>` : ''}
                  <span class="ib-tag ib-tag-${r.subject_key}">${r.subject_name || r.subject_key}</span>
                </td>
                <td style="font-weight: 700; color: #dc2626; font-size: 14.5px;">${baht(r.amount)}</td>
                <td>${r.recorded_by || '-'}</td>
                <td>
                  ${r.has_slip ? `
                    <button type="button" class="ib-btn ib-btn-outline ib-btn-sm btn-view-slip" data-id="${r.id}" data-type="expense">
                      📄 ดูสลิป
                    </button>
                  ` : '<span style="color: var(--muted);">-</span>'}
                </td>
                <td>
                  <button type="button" class="ib-btn ib-btn-outline ib-btn-sm btn-del-expense" data-id="${r.id}" style="color: #dc2626;">
                    ลบ
                  </button>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  }

  function attachTableEvents(container) {
    var slipBtns = container.querySelectorAll('.btn-view-slip');
    slipBtns.forEach(function (btn) {
      btn.onclick = async function () {
        var id = btn.getAttribute('data-id');
        var type = btn.getAttribute('data-type');
        btn.textContent = 'กำลังโหลด...';
        try {
          var res = type === 'income' ? await api('admin.finance.slip.income', { payment_id: id }) : await api('admin.finance.slip.expense', { expense_id: id });
          if (!res || !res.slip_url) throw new Error('ไม่พบข้อมูลสลิป');
          showSlipModal(res.slip_url, type === 'income' ? 'สลิปการโอนเงิน (รายรับ)' : 'หลักฐานการจ่ายเงิน (รายจ่าย)');
        } catch (e) {
          alert('ไม่สามารถโหลดสลิปได้: ' + e.message);
        } finally {
          btn.innerHTML = '📄 ดูสลิป';
        }
      };
    });

    var delBtns = container.querySelectorAll('.btn-del-expense');
    delBtns.forEach(function (btn) {
      btn.onclick = async function () {
        var id = btn.getAttribute('data-id');
        if (!confirm('ยืนยันลบรายการรายจ่ายนี้?')) return;
        try {
          await api('admin.finance.expense.delete', { expense_id: id });
          loadFinanceData();
        } catch (e) {
          alert(e.message);
        }
      };
    });
  }

  function showSlipModal(src, title) {
    var modal = document.getElementById('ib-slip-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'ib-slip-modal';
      modal.className = 'ib-modal-overlay';
      modal.innerHTML = `
        <div class="ib-modal-card">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <strong style="font-size: 16px; font-weight: 700;">${title}</strong>
            <button type="button" id="btn-close-modal" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--muted); line-height: 1;">&times;</button>
          </div>
          <div style="max-height: 65vh; overflow-y: auto; border-radius: 14px; margin: 14px 0;">
            <img src="${src}" style="width: 100%; border-radius: 14px; display: block;" alt="Slip" />
          </div>
          <div style="display: flex; justify-content: flex-end; gap: 8px;">
            <a href="${src}" target="_blank" download="slip" class="ib-btn ib-btn-outline">เปิดภาพเต็ม</a>
            <button type="button" id="btn-close-modal-2" class="ib-btn ib-btn-primary">ปิด</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      document.getElementById('btn-close-modal').onclick = function () { modal.remove(); };
      document.getElementById('btn-close-modal-2').onclick = function () { modal.remove(); };
      modal.onclick = function (e) { if (e.target === modal) modal.remove(); };
    }
  }

  function openExpenseModal() {
    var old = document.getElementById('ib-expense-modal');
    if (old) old.remove();

    var modal = document.createElement('div');
    modal.id = 'ib-expense-modal';
    modal.className = 'ib-modal-overlay';
    modal.innerHTML = `
      <div class="ib-modal-card">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <h3 style="font-size: 18px; font-weight: 800; margin: 0; color: var(--ink);">บันทึกรายจ่ายใหม่</h3>
          <button type="button" id="btn-close-exp" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--muted);">&times;</button>
        </div>
        <form id="ib-expense-form" style="display: flex; flex-direction: column; gap: 14px;">
          <div class="ib-field">
            <label>ชื่อรายการรายจ่าย *</label>
            <input type="text" name="title" required placeholder="เช่น ค่าชีทเรียน, ค่าเช่าเซิร์ฟเวอร์, ค่าวิทยากร" />
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div class="ib-field">
              <label>จำนวนเงิน (บาท) *</label>
              <input type="number" step="0.01" min="0" name="amount" required placeholder="0.00" />
            </div>
            <div class="ib-field">
              <label>วันที่เกิดรายการ *</label>
              <input type="date" name="date" required value="${new Date().toISOString().split('T')[0]}" />
            </div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div class="ib-field">
              <label>หมวดหมู่รายจ่าย *</label>
              <select name="category" required>
                <option value="ค่าชีท/เอกสาร">ค่าชีท/เอกสาร</option>
                <option value="ค่าสอน/วิทยากร">ค่าสอน/วิทยากร</option>
                <option value="ค่าระบบ/เซิร์ฟเวอร์">ค่าระบบ/เซิร์ฟเวอร์</option>
                <option value="ค่าการตลาด/โฆษณา">ค่าการตลาด/โฆษณา</option>
                <option value="อุปกรณ์/สถานที่">อุปกรณ์/สถานที่</option>
                <option value="อื่นๆ">อื่นๆ</option>
              </select>
            </div>
            <div class="ib-field">
              <label>สังกัดวิชา *</label>
              <select name="subject_key" required>
                ${currentUser && currentUser.instructor_subject ? `
                  <option value="${currentUser.instructor_subject}">${currentUser.instructor_subject_name || currentUser.instructor_subject}</option>
                ` : `
                  <option value="bio">ชีววิทยา (Bio)</option>
                  <option value="chem">เคมี (Chem)</option>
                  <option value="phys">ฟิสิกส์ (Phys)</option>
                  <option value="math">คณิตศาสตร์ (Math)</option>
                `}
              </select>
            </div>
          </div>
          <div class="ib-field">
            <label>ผูกกับคอร์สเรียน (ถ้ามี)</label>
            <select name="course_id">
              <option value="">-- ไม่ระบุคอร์ส --</option>
              ${cachedCourses.map(function (c) {
                return '<option value="' + c.id + '">' + c.title + '</option>';
              }).join('')}
            </select>
          </div>
          <div class="ib-field">
            <label>หมายเหตุเพิ่มเติม</label>
            <textarea name="note" rows="2" placeholder="รายละเอียดเพิ่มเติมหรือเลขที่ใบเสร็จ"></textarea>
          </div>
          <div class="ib-field">
            <label>แนบสลิป/หลักฐานการจ่ายเงิน (รูปภาพ)</label>
            <input type="file" id="ib-slip-input" accept="image/*" />
            <div id="ib-slip-preview" style="display: none; margin-top: 6px;">
              <img id="ib-slip-img" style="max-height: 120px; border-radius: 8px; border: 1px solid var(--line);" />
            </div>
          </div>
          <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 6px;">
            <button type="button" id="btn-cancel-exp" class="ib-btn ib-btn-outline">ยกเลิก</button>
            <button type="submit" id="btn-save-exp" class="ib-btn ib-btn-primary">บันทึกรายจ่าย</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(modal);

    function closeModal() { modal.remove(); }
    document.getElementById('btn-close-exp').onclick = closeModal;
    document.getElementById('btn-cancel-exp').onclick = closeModal;
    modal.onclick = function (e) { if (e.target === modal) closeModal(); };

    var slipBase64 = null;
    var slipMime = null;
    var fileInput = document.getElementById('ib-slip-input');
    fileInput.onchange = function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) {
        slipBase64 = null;
        slipMime = null;
        document.getElementById('ib-slip-preview').style.display = 'none';
        return;
      }
      slipMime = file.type;
      var reader = new FileReader();
      reader.onload = function (evt) {
        var res = evt.target.result;
        var parts = res.split(',');
        slipBase64 = parts[1];
        var img = document.getElementById('ib-slip-img');
        img.src = res;
        document.getElementById('ib-slip-preview').style.display = 'block';
      };
      reader.readAsDataURL(file);
    };

    var form = document.getElementById('ib-expense-form');
    form.onsubmit = async function (e) {
      e.preventDefault();
      var submitBtn = document.getElementById('btn-save-exp');
      submitBtn.disabled = true;
      submitBtn.textContent = 'กำลังบันทึก...';
      try {
        var payload = {
          title: form.title.value,
          amount: form.amount.value,
          category: form.category.value,
          subject_key: form.subject_key.value,
          course_id: form.course_id.value || null,
          date: form.date.value,
          note: form.note.value,
          slip: slipBase64 ? { mime: slipMime, base64: slipBase64 } : null
        };
        await api('admin.finance.expense.save', payload);
        closeModal();
        loadFinanceData();
      } catch (err) {
        alert(err.message);
        submitBtn.disabled = false;
        submitBtn.textContent = 'บันทึกรายจ่าย';
      }
    };
  }

})();
