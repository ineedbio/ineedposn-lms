// INeedBio Finance & Multi-Role Accounting Extension
(function () {
  'use strict';

  var currentToken = '';
  var currentUser = null;
  var currentSubject = ''; // '' for all, or 'bio' | 'chem' | 'phys' | 'math'
  var activeSubTab = 'incomes'; // 'incomes' | 'expenses'
  var cachedCourses = [];

  // Capture token and user from API calls
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

  async function api(action, data) {
    var url = window.INEEDBIO_API_URL || '/api/ib';
    var res = await _origFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: action, data: data || {}, token: currentToken })
    });
    var json = await res.json();
    if (!json.ok) throw new Error(json.message || json.error || 'เกิดข้อผิดพลาด');
    return json.data;
  }

  function baht(n) {
    return '฿' + Number(n || 0).toLocaleString('th-TH');
  }

  function fmtDate(isoStr) {
    if (!isoStr) return '-';
    var d = new Date(isoStr);
    return isNaN(d.getTime()) ? isoStr : d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  // Inject styles for Finance tab
  var style = document.createElement('style');
  style.textContent = `
    .ib-finance-panel { margin-top: 24px; display: flex; flex-direction: column; gap: 20px; font-family: inherit; }
    .ib-stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .ib-stat-card { background: rgb(var(--bg2)); border: 1px solid rgb(var(--line)); border-radius: 16px; padding: 20px; display: flex; flex-direction: column; gap: 6px; }
    .ib-stat-card.income { border-left: 4px solid #16a34a; }
    .ib-stat-card.expense { border-left: 4px solid #dc2626; }
    .ib-stat-card.profit { border-left: 4px solid #2563eb; }
    .ib-stat-title { font-size: 13px; color: rgb(var(--muted)); font-weight: 600; }
    .ib-stat-val { font-size: 24px; font-weight: 800; color: rgb(var(--ink)); }
    .ib-stat-sub { font-size: 12px; color: rgb(var(--ink2)); }
    .ib-toolbar { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 20px; }
    .ib-subnav { display: flex; gap: 8px; background: rgb(var(--bg3)); padding: 4px; border-radius: 999px; }
    .ib-subnav button { padding: 8px 18px; border: none; border-radius: 999px; background: transparent; cursor: pointer; font-size: 13px; font-weight: 600; color: rgb(var(--ink2)); transition: all .15s; }
    .ib-subnav button.active { background: rgb(var(--ink)); color: rgb(var(--bg)); box-shadow: 0 2px 8px rgba(0,0,0,.1); }
    .ib-table { width: 100%; border-collapse: separate; border-spacing: 0; background: rgb(var(--bg2)); border: 1px solid rgb(var(--line)); border-radius: 16px; overflow: hidden; font-size: 13px; }
    .ib-table th { background: rgb(var(--bg3)); padding: 12px 16px; text-align: left; font-weight: 700; color: rgb(var(--ink2)); border-bottom: 1px solid rgb(var(--line)); }
    .ib-table td { padding: 14px 16px; border-bottom: 1px solid rgb(var(--line)); vertical-align: middle; color: rgb(var(--ink)); }
    .ib-table tr:last-child td { border-bottom: none; }
    .ib-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 999px; font-size: 13px; font-weight: 600; border: none; cursor: pointer; transition: all .15s; text-decoration: none; }
    .ib-btn-primary { background: rgb(var(--acc)); color: rgb(var(--on-acc)); }
    .ib-btn-primary:hover { opacity: .9; transform: translateY(-1px); }
    .ib-btn-outline { background: transparent; border: 1px solid rgb(var(--line)); color: rgb(var(--ink)); }
    .ib-btn-outline:hover { background: rgb(var(--bg3)); }
    .ib-btn-sm { padding: 4px 10px; font-size: 12px; }
    .ib-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); z-index: 99999; display: flex; align-items: center; justify-content: center; padding: 16px; }
    .ib-modal-card { background: rgb(var(--bg)); border: 1px solid rgb(var(--line)); border-radius: 20px; max-width: 520px; width: 100%; max-height: 90vh; overflow-y: auto; padding: 24px; box-shadow: 0 20px 40px rgba(0,0,0,0.25); display: flex; flex-direction: column; gap: 16px; }
    .ib-field { display: flex; flex-direction: column; gap: 6px; }
    .ib-field label { font-size: 12px; font-weight: 700; color: rgb(var(--ink2)); }
    .ib-field input, .ib-field select, .ib-field textarea { padding: 10px 14px; border-radius: 10px; border: 1px solid rgb(var(--line)); background: rgb(var(--bg2)); color: rgb(var(--ink)); font-family: inherit; font-size: 13px; outline: none; }
    .ib-field input:focus, .ib-field select:focus, .ib-field textarea:focus { border-color: rgb(var(--acc)); }
    .ib-tag { display: inline-block; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; }
    .ib-tag-chem { background: #ffedd5; color: #c2410c; }
    .ib-tag-bio { background: #dcfce7; color: #15803d; }
    .ib-tag-phys { background: #e0f2fe; color: #0369a1; }
    .ib-tag-math { background: #f3e8ff; color: #7e22ce; }
  `;
  document.head.appendChild(style);

  // Monitor DOM to add Tab
  var checkTimer = setInterval(function () {
    if (window.location.hash.indexOf('#/admin') !== 0) return;
    setupAdminUI();
  }, 400);

  function setupAdminUI() {
    var nav = document.querySelector('nav.ad-nav, nav.tabs, .ad-tabs, [role="tablist"], .adnav');
    if (!nav) {
      var links = document.querySelectorAll('a, button');
      for (var i = 0; i < links.length; i++) {
        if (links[i].textContent && links[i].textContent.indexOf('คำขอเข้าเรียน') >= 0) {
          nav = links[i].parentElement;
          break;
        }
      }
    }
    if (!nav || nav.querySelector('.ib-finance-tab-btn')) return;

    // Instructor Subject Role Enforcement
    if (currentUser && currentUser.instructor_subject) {
      currentSubject = currentUser.instructor_subject;
      var items = nav.children;
      for (var j = 0; j < items.length; j++) {
        var text = items[j].textContent || '';
        if (text.indexOf('ผู้ใช้') >= 0 || text.indexOf('ตั้งค่า') >= 0) {
          items[j].style.display = 'none';
        }
      }
      var hdr = document.querySelector('.ad-hdr, .adhdr, h1');
      if (hdr && !document.querySelector('.ib-instructor-badge')) {
        var badge = document.createElement('span');
        badge.className = 'ib-instructor-badge';
        badge.style.cssText = 'font-size: 13px; font-weight: 600; padding: 4px 12px; border-radius: 999px; margin-left: 12px; background: rgb(var(--acc)); color: rgb(var(--on-acc)); vertical-align: middle;';
        badge.textContent = 'ครูผู้สอนวิชา: ' + (currentUser.instructor_subject_name || currentUser.instructor_subject);
        hdr.appendChild(badge);
      }
    }

    var tabBtn = document.createElement('button');
    tabBtn.className = 'ib-finance-tab-btn tab ' + (nav.children[0] ? nav.children[0].className : '');
    tabBtn.type = 'button';
    tabBtn.innerHTML = '💰 บัญชีรายรับ-รายจ่าย';
    tabBtn.onclick = function (e) {
      e.preventDefault();
      activateFinanceTab(nav, tabBtn);
    };
    nav.appendChild(tabBtn);

    for (var k = 0; k < nav.children.length; k++) {
      if (nav.children[k] !== tabBtn) {
        nav.children[k].addEventListener('click', function () {
          var p = document.getElementById('ib-finance-container');
          if (p) p.style.display = 'none';
          var defaultContent = document.querySelector('.ad-body, .ad-content, .adcontent');
          if (defaultContent) defaultContent.style.display = '';
          tabBtn.classList.remove('active', 'on');
        });
      }
    }
  }

  async function activateFinanceTab(nav, tabBtn) {
    for (var i = 0; i < nav.children.length; i++) {
      nav.children[i].classList.remove('active', 'on');
    }
    tabBtn.classList.add('active', 'on');

    var defaultContent = document.querySelector('.ad-body, .ad-content, .adcontent');
    if (defaultContent) defaultContent.style.display = 'none';

    var container = document.getElementById('ib-finance-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'ib-finance-container';
      container.className = 'ib-finance-panel';
      if (defaultContent && defaultContent.parentElement) {
        defaultContent.parentElement.appendChild(container);
      } else {
        document.body.appendChild(container);
      }
    }
    container.style.display = 'flex';
    container.style.flexDirection = 'column';

    renderFinanceView(container);
  }

  async function renderFinanceView(container) {
    container.innerHTML = '<div style="text-align: center; padding: 40px; color: rgb(var(--muted));">กำลังโหลดข้อมูลการเงินและบัญชี...</div>';

    try {
      if (!cachedCourses.length) {
        cachedCourses = (await api('admin.courses')) || [];
      }
      var summary = await api('admin.finance.summary', { subject: currentSubject });
      var incomes = activeSubTab === 'incomes' ? await api('admin.finance.incomes', { subject: currentSubject }) : [];
      var expenses = activeSubTab === 'expenses' ? await api('admin.finance.expenses', { subject: currentSubject }) : [];

      var isSuper = !currentUser || !currentUser.instructor_subject;

      container.innerHTML = `
        <div class="ib-toolbar">
          <div style="display: flex; align-items: center; gap: 12px;">
            <h2 style="font-size: 20px; font-weight: 800; margin: 0;">💰 บัญชีรายรับ-รายจ่าย</h2>
            ${isSuper ? `
              <select id="ib-subject-selector" class="ib-btn ib-btn-outline" style="padding: 6px 12px;">
                <option value="" ${currentSubject === '' ? 'selected' : ''}>ทุกวิชา</option>
                <option value="bio" ${currentSubject === 'bio' ? 'selected' : ''}>ชีววิทยา</option>
                <option value="chem" ${currentSubject === 'chem' ? 'selected' : ''}>เคมี</option>
                <option value="phys" ${currentSubject === 'phys' ? 'selected' : ''}>ฟิสิกส์</option>
                <option value="math" ${currentSubject === 'math' ? 'selected' : ''}>คณิตศาสตร์</option>
              </select>
            ` : `
              <span class="ib-tag ib-tag-${currentSubject}" style="font-size: 13px; padding: 4px 10px;">
                วิชา: ${summary.subject_name || currentSubject}
              </span>
            `}
          </div>

          <div style="display: flex; gap: 10px; align-items: center;">
            <div class="ib-subnav">
              <button type="button" id="btn-sub-inc" class="${activeSubTab === 'incomes' ? 'active' : ''}">
                รายรับ (${summary.income_count})
              </button>
              <button type="button" id="btn-sub-exp" class="${activeSubTab === 'expenses' ? 'active' : ''}">
                รายจ่าย (${summary.expense_count})
              </button>
            </div>
            <button type="button" id="btn-add-expense" class="ib-btn ib-btn-primary">
              + บันทึกรายจ่าย
            </button>
          </div>
        </div>

        <div class="ib-stat-grid">
          <div class="ib-stat-card income">
            <span class="ib-stat-title">รายรับรวม (Approved Incomes)</span>
            <span class="ib-stat-val" style="color: #16a34a;">${baht(summary.total_income)}</span>
            <span class="ib-stat-sub">จากนักเรียนที่อนุมัติแล้ว ${summary.income_count} รายการ</span>
          </div>
          <div class="ib-stat-card expense">
            <span class="ib-stat-title">รายจ่ายรวม (Total Expenses)</span>
            <span class="ib-stat-val" style="color: #dc2626;">${baht(summary.total_expense)}</span>
            <span class="ib-stat-sub">บันทึกค่าใช้จ่าย ${summary.expense_count} รายการ</span>
          </div>
          <div class="ib-stat-card profit">
            <span class="ib-stat-title">กำไรสุทธิ (Net Profit)</span>
            <span class="ib-stat-val" style="color: ${summary.net_profit >= 0 ? '#2563eb' : '#dc2626'}">
              ${baht(summary.net_profit)}
            </span>
            <span class="ib-stat-sub">คำนวณจากรายรับหักลบรายจ่าย</span>
          </div>
        </div>

        <div id="ib-tab-table-container">
          ${activeSubTab === 'incomes' ? renderIncomesTable(incomes) : renderExpensesTable(expenses)}
        </div>
      `;

      var sel = document.getElementById('ib-subject-selector');
      if (sel) {
        sel.onchange = function () {
          currentSubject = sel.value;
          renderFinanceView(container);
        };
      }
      document.getElementById('btn-sub-inc').onclick = function () {
        activeSubTab = 'incomes';
        renderFinanceView(container);
      };
      document.getElementById('btn-sub-exp').onclick = function () {
        activeSubTab = 'expenses';
        renderFinanceView(container);
      };
      document.getElementById('btn-add-expense').onclick = function () {
        openExpenseModal(container);
      };

      attachTableEvents(container);

    } catch (err) {
      container.innerHTML = '<div style="padding: 30px; color: #dc2626; text-align: center;">เกิดข้อผิดพลาด: ' + err.message + '</div>';
    }
  }

  function renderIncomesTable(rows) {
    if (!rows.length) {
      return '<div style="padding: 40px; text-align: center; color: rgb(var(--muted));">ไม่มีรายการรายรับในหมวดหมู่นี้</div>';
    }
    return `
      <table class="ib-table">
        <thead>
          <tr>
            <th>วันที่อนุมัติ</th>
            <th>ชื่อนักเรียน</th>
            <th>คอร์สเรียน</th>
            <th>วิชา</th>
            <th>ยอดเงิน</th>
            <th>สลิปโอนเงิน</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(function (r) {
            return `
              <tr>
                <td>${fmtDate(r.reviewed_at || r.created_at)}</td>
                <td>
                  <strong>${r.student_name}</strong> ${r.student_nickname ? '(' + r.student_nickname + ')' : ''}
                  <div style="font-size: 11px; color: rgb(var(--muted));">${r.student_email}</div>
                </td>
                <td><strong>${r.course_title}</strong></td>
                <td><span class="ib-tag ib-tag-${r.subject_key}">${r.subject_name || r.subject_key}</span></td>
                <td style="font-weight: 700; color: #16a34a;">${baht(r.amount)}</td>
                <td>
                  ${r.has_slip ? `
                    <button type="button" class="ib-btn ib-btn-outline ib-btn-sm btn-view-slip" data-id="${r.payment_id}" data-type="income">
                      🔍 ดูสลิป
                    </button>
                  ` : '<span style="color: rgb(var(--muted));">ไม่มีสลิป</span>'}
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
      return '<div style="padding: 40px; text-align: center; color: rgb(var(--muted));">ยังไม่มีการบันทึกรายจ่าย</div>';
    }
    return `
      <table class="ib-table">
        <thead>
          <tr>
            <th>วันที่</th>
            <th>รายการรายจ่าย</th>
            <th>หมวดหมู่</th>
            <th>คอร์ส/วิชา</th>
            <th>ยอดเงิน</th>
            <th>ผู้บันทึก</th>
            <th>สลิป/ใบเสร็จ</th>
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
                  ${r.note ? `<div style="font-size: 11px; color: rgb(var(--muted));">${r.note}</div>` : ''}
                </td>
                <td><span style="background: rgb(var(--bg3)); padding: 2px 8px; border-radius: 6px; font-size: 12px;">${r.category}</span></td>
                <td>
                  ${r.course_title ? `<div style="font-size: 12px;">${r.course_title}</div>` : ''}
                  <span class="ib-tag ib-tag-${r.subject_key}">${r.subject_name || r.subject_key}</span>
                </td>
                <td style="font-weight: 700; color: #dc2626;">${baht(r.amount)}</td>
                <td>${r.recorded_by || '-'}</td>
                <td>
                  ${r.has_slip ? `
                    <button type="button" class="ib-btn ib-btn-outline ib-btn-sm btn-view-slip" data-id="${r.expense_id}" data-type="expense">
                      🧾 ดูใบเสร็จ
                    </button>
                  ` : '<span style="color: rgb(var(--muted));">ไม่มีสลิป</span>'}
                </td>
                <td>
                  <button type="button" class="ib-btn ib-btn-outline ib-btn-sm btn-delete-expense" data-id="${r.expense_id}" style="color: #dc2626;">
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
    var viewBtns = container.querySelectorAll('.btn-view-slip');
    viewBtns.forEach(function (b) {
      b.onclick = async function () {
        var id = b.getAttribute('data-id');
        var type = b.getAttribute('data-type');
        b.textContent = 'กำลังโหลด...';
        try {
          var slipData = type === 'expense'
            ? await api('admin.finance.expense.slip', { expense_id: id })
            : await api('admin.slip', { enroll_id: id });
          showImageModal(slipData.mime, slipData.base64, type === 'expense' ? 'ใบเสร็จ / สลิปรายจ่าย' : 'สลิปโอนเงินของนักเรียน');
        } catch (e) {
          alert(e.message);
        } finally {
          b.textContent = type === 'expense' ? '🧾 ดูใบเสร็จ' : '🔍 ดูสลิป';
        }
      };
    });

    var delBtns = container.querySelectorAll('.btn-delete-expense');
    delBtns.forEach(function (b) {
      b.onclick = async function () {
        var id = b.getAttribute('data-id');
        if (!confirm('ยืนยันลบรายการรายจ่ายนี้?')) return;
        try {
          await api('admin.finance.expense.delete', { expense_id: id });
          renderFinanceView(container);
        } catch (e) {
          alert(e.message);
        }
      };
    });
  }

  function showImageModal(mime, base64, title) {
    var modal = document.createElement('div');
    modal.className = 'ib-modal-overlay';
    var src = 'data:' + mime + ';base64,' + base64;
    modal.innerHTML = `
      <div class="ib-modal-card" style="max-width: 440px; text-align: center;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgb(var(--line)); padding-bottom: 12px;">
          <strong style="font-size: 15px;">${title}</strong>
          <button type="button" id="btn-close-modal" style="background: none; border: none; font-size: 20px; cursor: pointer; color: rgb(var(--muted));">&times;</button>
        </div>
        <div style="max-height: 70vh; overflow-y: auto; border-radius: 12px;">
          <img src="${src}" style="width: 100%; border-radius: 12px; display: block;" alt="Slip" />
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 8px; padding-top: 8px;">
          <a href="${src}" target="_blank" download="slip" class="ib-btn ib-btn-outline">เปิดภาพเต็ม</a>
          <button type="button" id="btn-close-modal-bottom" class="ib-btn ib-btn-primary">ปิด</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    var close = function () { modal.remove(); };
    modal.querySelector('#btn-close-modal').onclick = close;
    modal.querySelector('#btn-close-modal-bottom').onclick = close;
    modal.onclick = function (e) { if (e.target === modal) close(); };
  }

  function openExpenseModal(container) {
    var isSuper = !currentUser || !currentUser.instructor_subject;
    var defaultSubj = currentSubject || 'bio';

    var modal = document.createElement('div');
    modal.className = 'ib-modal-overlay';
    modal.innerHTML = `
      <div class="ib-modal-card">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgb(var(--line)); padding-bottom: 12px;">
          <strong style="font-size: 16px;">+ บันทึกรายจ่ายใหม่</strong>
          <button type="button" id="btn-close-exp" style="background: none; border: none; font-size: 20px; cursor: pointer; color: rgb(var(--muted));">&times;</button>
        </div>
        <form id="exp-form" style="display: flex; flex-direction: column; gap: 14px;">
          <div class="ib-field">
            <label>ชื่อรายการรายจ่าย *</label>
            <input type="text" name="title" placeholder="เช่น ค่าชีทประกอบการเรียน, ค่าถ่ายทำคลิป" required />
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div class="ib-field">
              <label>จำนวนเงิน (บาท) *</label>
              <input type="number" name="amount" min="1" placeholder="0" required />
            </div>
            <div class="ib-field">
              <label>หมวดหมู่รายจ่าย</label>
              <select name="category">
                <option value="ค่าชีท/เอกสาร">ค่าชีท / เอกสาร</option>
                <option value="ค่าตัดต่อ/ถ่ายทำ">ค่าตัดต่อ / ถ่ายทำ</option>
                <option value="ค่ายิงแอด/การตลาด">ค่ายิงแอด / การตลาด</option>
                <option value="ค่าตัวผู้สอน">ค่าตัวผู้สอน</option>
                <option value="ค่าธรรมเนียม/บริการ">ค่าธรรมเนียม / บริการ</option>
                <option value="อื่นๆ">อื่นๆ</option>
              </select>
            </div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div class="ib-field">
              <label>วิชา *</label>
              ${isSuper ? `
                <select name="subject_key" id="exp-subj-select">
                  <option value="bio">ชีววิทยา</option>
                  <option value="chem">เคมี</option>
                  <option value="phys">ฟิสิกส์</option>
                  <option value="math">คณิตศาสตร์</option>
                </select>
              ` : `
                <input type="text" value="${currentUser.instructor_subject_name || defaultSubj}" disabled />
                <input type="hidden" name="subject_key" value="${defaultSubj}" />
              `}
            </div>
            <div class="ib-field">
              <label>คอร์สที่เกี่ยวข้อง (ไม่บังคับ)</label>
              <select name="course_id" id="exp-course-select">
                <option value="">-- ทั้งวิชา / ไม่ระบุคอร์ส --</option>
                ${cachedCourses.map(function (c) {
                  return `<option value="${c.course_id}">${c.title}</option>`;
                }).join('')}
              </select>
            </div>
          </div>
          <div class="ib-field">
            <label>วันที่</label>
            <input type="date" name="date" value="${new Date().toISOString().slice(0, 10)}" />
          </div>
          <div class="ib-field">
            <label>แนบสลิป / ใบเสร็จหลักฐาน (JPG / PNG ไม่เกิน 3 MB)</label>
            <input type="file" id="exp-file-input" accept="image/png, image/jpeg, image/webp" />
            <div id="exp-img-preview" style="display: none; margin-top: 8px;">
              <img style="max-height: 120px; border-radius: 8px; border: 1px solid rgb(var(--line));" />
            </div>
          </div>
          <div class="ib-field">
            <label>บันทึกเพิ่มเติม</label>
            <textarea name="note" rows="2" placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)"></textarea>
          </div>
          <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 10px;">
            <button type="button" id="btn-cancel-exp" class="ib-btn ib-btn-outline">ยกเลิก</button>
            <button type="submit" id="btn-submit-exp" class="ib-btn ib-btn-primary">บันทึกรายจ่าย</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(modal);

    var closeModal = function () { modal.remove(); };
    modal.querySelector('#btn-close-exp').onclick = closeModal;
    modal.querySelector('#btn-cancel-exp').onclick = closeModal;

    var fileInput = modal.querySelector('#exp-file-input');
    var preview = modal.querySelector('#exp-img-preview');
    var slipBase64 = null;
    var slipMime = '';

    fileInput.onchange = function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      slipMime = file.type;
      var reader = new FileReader();
      reader.onload = function (ev) {
        var res = ev.target.result;
        slipBase64 = String(res).split(',')[1];
        preview.style.display = 'block';
        preview.querySelector('img').src = res;
      };
      reader.readAsDataURL(file);
    };

    var form = modal.querySelector('#exp-form');
    form.onsubmit = async function (e) {
      e.preventDefault();
      var submitBtn = modal.querySelector('#btn-submit-exp');
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
        renderFinanceView(container);
      } catch (err) {
        alert(err.message);
        submitBtn.disabled = false;
        submitBtn.textContent = 'บันทึกรายจ่าย';
      }
    };
  }

})();
