/* MITAOE Library - Clean scripts.js
   Features:
   - Staff login (admin / mitaoe123)
   - Student signup & login
   - Mutual-exclusive sessions (staff <-> student)
   - Books stored in localStorage (seeded)
   - Issue by student (from Books page) or by staff (issue form)
   - Student "Request Return" on Issue page (or Dashboard)
   - Staff approves return (pending requests)
   - Navbar auto-updates based on role
*/

/* -------------------- Keys -------------------- */
const BOOKS_KEY = "mitaoe_books_v1";
const ISSUED_KEY = "mitaoe_issued_v1";
const STUDENTS_KEY = "mitaoe_students_v1";
const STAFF_KEY = "mitaoe_staff_session_v1";
const STUDENT_KEY = "mitaoe_student_session_v1";
const RETURN_KEY = "mitaoe_return_requests_v1";

/* -------------------- Helpers -------------------- */
function save(key, val){ localStorage.setItem(key, JSON.stringify(val)); }
function load(key){ const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; }

/* -------------------- Seed data (first run) -------------------- */
function initializeIfNeeded(){
  if(!load(BOOKS_KEY)){
    const sampleBooks = [
      { id:'B001', title:'Digital Communication', author:'Proakis', category:'Engineering', isbn:'978-013', status:'Available' },
      { id:'B002', title:'Signals and Systems', author:'Oppenheim', category:'Engineering', isbn:'978-007', status:'Available' },
      { id:'B003', title:'Embedded Systems', author:'Frank Vahid', category:'Engineering', isbn:'978-012', status:'Available' },
      { id:'B004', title:'Microprocessors & Interfacing', author:'Douglas V. Hall', category:'Engineering', isbn:'978-0134', status:'Available' },
      { id:'B005', title:'Communication Systems', author:'Simon Haykin', category:'E&TC', isbn:'978-047', status:'Available' }
    ];
    save(BOOKS_KEY, sampleBooks);
  }
  if(!load(ISSUED_KEY)) save(ISSUED_KEY, []);
  if(!load(STUDENTS_KEY)){
    const sampleStudents = [
      { id:'202402070019', name:'Stuti Orpe', email:'stuti@demo.com', password:'1234' },
      { id:'202402070025', name:'Rohan Patil', email:'rohan@demo.com', password:'abcd' }
    ];
    save(STUDENTS_KEY, sampleStudents);
  }
  if(!load(RETURN_KEY)) save(RETURN_KEY, []);
}

/* -------------------- Accessors -------------------- */
function getBooks(){ return load(BOOKS_KEY) || []; }
function setBooks(arr){ save(BOOKS_KEY, arr); }

function getIssued(){ return load(ISSUED_KEY) || []; }
function setIssued(arr){ save(ISSUED_KEY, arr); }

function getStudents(){ return load(STUDENTS_KEY) || []; }
function setStudents(arr){ save(STUDENTS_KEY, arr); }

function getReturnRequests(){ return load(RETURN_KEY) || []; }
function setReturnRequests(arr){ save(RETURN_KEY, arr); }

/* -------------------- Session helpers -------------------- */
function isStaffLogged(){ return !!load(STAFF_KEY); }
function setStaffSession(obj){ save(STAFF_KEY, obj); }
function clearStaffSession(){ localStorage.removeItem(STAFF_KEY); }

function isStudentLogged(){ return !!load(STUDENT_KEY); }
function setStudentSession(obj){ save(STUDENT_KEY, obj); }
function clearStudentSession(){ localStorage.removeItem(STUDENT_KEY); }

function todayStr(){ const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }

/* -------------------- Auth functions -------------------- */
function staffLogin(username, password){
  // correct credentials
  if(username === "admin" && password === "mitaoe123"){
    // mutual-exclusive: staff logs out student
    clearStudentSession();
    setStaffSession({ username:'admin', loggedAt: new Date().toISOString() });
    return true;
  }
  return false;
}
function staffLogout(){
  clearStaffSession();
  // reload so UI updates
  window.location.href = 'index.html';
}

function studentAuthenticate(id, password){
  const students = getStudents();
  return students.find(s => s.id === id && s.password === password) || null;
}
function studentRegister(id, name, email, password){
  const students = getStudents();
  if(students.find(s=>s.id===id)) return { ok:false, msg:'Student ID already exists' };
  if(password.length < 4) return { ok:false, msg:'Password must be at least 4 characters' };
  students.push({ id, name, email, password });
  setStudents(students);
  return { ok:true };
}

/* -------------------- Book Issuing -------------------- */
function issueBookToStudent(bookId, studentId, studentName){
  const books = getBooks();
  const book = books.find(b => b.id === bookId);
  if(!book) return { ok:false, msg:'Book not found' };
  if(book.status !== 'Available') return { ok:false, msg:'Book not available' };
  book.status = 'Issued';
  setBooks(books);

  const issued = getIssued();
  issued.push({ bookId: book.id, studentId, studentName, issueDate: todayStr() });
  setIssued(issued);
  return { ok:true };
}

/* -------------------- Return Request System -------------------- */
function addReturnRequest(bookId, studentId){
  const requests = getReturnRequests();
  if(requests.some(r => r.bookId===bookId && r.studentId===studentId)) return { ok:false, msg:'Already requested' };
  requests.push({ bookId, studentId, date: todayStr() });
  setReturnRequests(requests);
  return { ok:true };
}
function approveReturn(bookId, studentId){
  // remove request
  let requests = getReturnRequests();
  requests = requests.filter(r => !(r.bookId===bookId && r.studentId===studentId));
  setReturnRequests(requests);
  // remove issued record
  let issued = getIssued();
  issued = issued.filter(it => !(it.bookId===bookId && it.studentId===studentId));
  setIssued(issued);
  // mark book available
  const books = getBooks();
  const book = books.find(b => b.id === bookId);
  if(book) book.status = 'Available';
  setBooks(books);
  return { ok:true };
}

/* -------------------- Rendering Helpers -------------------- */
function updateNavbarAndPanels(){
  // nav elements (exist on pages)
  const navStudent = document.querySelectorAll('.nav-student');
  const navStaff = document.querySelectorAll('.nav-staff');
  const studentInfo = document.getElementById('student-info');
  const staffInfo = document.getElementById('staff-info');
  const studentLogoutBtn = document.getElementById('student-logout-btn');
  const staffLogoutBtn = document.getElementById('logout-btn');

  // default show both login links
  navStudent.forEach(n=>n.style.display='');
  navStaff.forEach(n=>n.style.display='');

  // hide/show according to active role
  if(isStaffLogged()){
    navStudent.forEach(n=>n.style.display='none'); // hide student login/signup
    if(staffInfo) staffInfo.textContent = 'Staff: admin';
    if(studentInfo) studentInfo.textContent = '';
    if(staffLogoutBtn) staffLogoutBtn.style.display = 'inline-block';
    if(studentLogoutBtn) studentLogoutBtn.style.display = 'none';
    // hide student-only sections
    document.querySelectorAll('.student-only').forEach(el => el.style.display = 'none');
    // show staff-only
    document.querySelectorAll('.staff-only').forEach(el => el.style.display = '');
  } else if(isStudentLogged()){
    navStaff.forEach(n=>n.style.display='none'); // hide staff login link
    const s = load(STUDENT_KEY);
    if(studentInfo) studentInfo.textContent = `${s.name} (${s.id})`;
    if(staffInfo) staffInfo.textContent = '';
    if(studentLogoutBtn) studentLogoutBtn.style.display = 'inline-block';
    if(staffLogoutBtn) staffLogoutBtn.style.display = 'none';
    // hide staff-only sections
    document.querySelectorAll('.staff-only').forEach(el => el.style.display = 'none');
    // show student-only
    document.querySelectorAll('.student-only').forEach(el => el.style.display = '');
  } else {
    // no one logged
    if(studentInfo) studentInfo.textContent = '';
    if(staffInfo) staffInfo.textContent = '';
    if(studentLogoutBtn) studentLogoutBtn.style.display = 'none';
    if(staffLogoutBtn) staffLogoutBtn.style.display = 'none';
    // show both login links
    navStudent.forEach(n=>n.style.display='');
    navStaff.forEach(n=>n.style.display='');
    // hide dynamic panels
    document.querySelectorAll('.staff-only').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.student-only').forEach(el => el.style.display = 'none');
  }
}

/* render books table (for books page) */
function renderBooksTable(tbodyId, booksToRender){
  const tbody = document.getElementById(tbodyId);
  if(!tbody) return;
  tbody.innerHTML = '';
  booksToRender.forEach(b=>{
    const tr = document.createElement('tr');
    const isAvailable = b.status === 'Available';
    tr.innerHTML = `
      <td>${b.title}</td>
      <td>${b.author}</td>
      <td>${b.category}</td>
      <td>${b.isbn}</td>
      <td><span class="badge">${b.status}</span></td>
      <td style="white-space:nowrap">
        <button class="btn ghost" onclick="viewBook('${b.id}')">View</button>
        <button class="btn" onclick="onIssueClick('${b.id}')" ${!isAvailable ? 'disabled style="opacity:.6;cursor:not-allowed"' : ''}>Issue</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/* student-issued table (used on dashboard and issue page) */
function renderStudentIssuedTableByTbody(tbodyId){
  const tbody = document.getElementById(tbodyId);
  if(!tbody) return;
  const session = load(STUDENT_KEY);
  if(!session){ tbody.innerHTML = `<tr><td colspan="4" class="small">Please login as student to view issued books.</td></tr>`; return; }
  const issued = getIssued().filter(i => i.studentId === session.id);
  tbody.innerHTML = '';
  if(issued.length === 0){
    tbody.innerHTML = `<tr><td colspan="4" class="small">No books issued to you.</td></tr>`;
    return;
  }
  const requests = getReturnRequests();
  issued.forEach(r=>{
    const book = getBooks().find(b=>b.id===r.bookId) || {};
    const hasRequested = requests.some(q=>q.bookId===r.bookId && q.studentId===session.id);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${r.bookId}</td>
      <td>${book.title || '-'}</td>
      <td>${r.issueDate}</td>
      <td style="white-space:nowrap">
        ${ hasRequested ? '<span class="small">Request Sent</span>' : `<button class="btn ghost" onclick="requestReturn('${r.bookId}')">Request Return</button>` }
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/* issued table for staff */
function renderIssuedStaffTable(){
  const tbody = document.getElementById('issued-tbody');
  if(!tbody) return;
  const issued = getIssued();
  const books = getBooks();
  tbody.innerHTML = '';
  if(issued.length === 0){ tbody.innerHTML = `<tr><td colspan="6" class="small">No issued books.</td></tr>`; return; }
  issued.forEach(r=>{
    const book = books.find(b=>b.id===r.bookId) || {};
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${r.bookId}</td>
      <td>${book.title || '-'}</td>
      <td>${r.studentId}</td>
      <td>${r.studentName}</td>
      <td>${r.issueDate}</td>
      <td><button class="btn ghost" onclick="approveReturn('${r.bookId}','${r.studentId}')">Return</button></td>
    `;
    tbody.appendChild(tr);
  });
}

/* return requests table (staff view) */
function renderReturnRequestsTable(){
  const tbody = document.getElementById('return-requests-tbody');
  if(!tbody) return;
  const reqs = getReturnRequests();
  const books = getBooks();
  const students = getStudents();
  tbody.innerHTML = '';
  if(reqs.length === 0){ tbody.innerHTML = `<tr><td colspan="6" class="small">No pending return requests.</td></tr>`; return; }
  reqs.forEach(r=>{
    const book = books.find(b=>b.id===r.bookId) || {};
    const student = students.find(s=>s.id===r.studentId) || {};
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${r.bookId}</td>
      <td>${book.title || '-'}</td>
      <td>${r.studentId}</td>
      <td>${student.name || '-'}</td>
      <td>${r.date}</td>
      <td><button class="btn" onclick="approveReturn('${r.bookId}','${r.studentId}')">Approve Return</button></td>
    `;
    tbody.appendChild(tr);
  });
}

/* -------------------- UI Actions -------------------- */

/* view book details (simple alert) */
window.viewBook = function(bookId){
  const book = getBooks().find(b=>b.id===bookId);
  if(!book) return alert('Book not found');
  alert(`${book.title}\nAuthor: ${book.author}\nCategory: ${book.category}\nISBN: ${book.isbn}\nStatus: ${book.status}`);
};

/* Issue button clicked on Books page */
window.onIssueClick = function(bookId){
  if(isStudentLogged()){
    const session = load(STUDENT_KEY);
    const res = issueBookToStudent(bookId, session.id, session.name);
    if(!res.ok) return alert(res.msg);
    alert('Book issued to you');
    // refresh tables if on page
    renderBooksIfPresent();
    renderStudentIssuedTableIfPresent();
  } else {
    if(confirm('You must login as student to issue books. Go to Student Login?')) window.location.href = 'student-login.html';
  }
};

/* request return (student) */
window.requestReturn = function(bookId){
  if(!isStudentLogged()){ alert('Login as student to request return'); window.location.href='student-login.html'; return; }
  const session = load(STUDENT_KEY);
  const res = addReturnRequest(bookId, session.id);
  if(!res.ok) return alert(res.msg);
  // feedback + refresh student table on page
  alert('Return request submitted to staff.');
  renderStudentIssuedTableIfPresent();
  renderReturnRequestsIfPresent();
};

/* staff approves return (from pending or issued list) */
window.approveReturn = function(bookId, studentId){
  if(!isStaffLogged()){ alert('Staff login required'); window.location.href='login.html'; return; }
  const res = approveReturn(bookId, studentId);
  if(!res.ok) return alert(res.msg);
  alert('Return approved and book marked Available');
  renderIssuedStaffTable();
  renderReturnRequestsTable();
  renderBooksIfPresent();
  renderStudentIssuedTableIfPresent();
};

/* -------------------- Page-specific helpers -------------------- */
function renderBooksIfPresent(){
  if(document.getElementById('books-tbody')) renderBooksTable('books-tbody', getBooks());
}
function renderIssuedStaffTableIfPresent(){
  if(document.getElementById('issued-tbody')) renderIssuedStaffTable();
}
function renderReturnRequestsIfPresent(){
  if(document.getElementById('return-requests-tbody')) renderReturnRequestsTable();
}
function renderStudentIssuedTableIfPresent(){
  // tries both IDs used in earlier versions
  if(document.getElementById('student-issued-tbody')) renderStudentIssuedTableByTbody('student-issued-tbody');
  if(document.getElementById('student-issued-tbody-issuepage')) renderStudentIssuedTableByTbody('student-issued-tbody-issuepage');
}

/* -------------------- Forms setup -------------------- */
function setupStaffLoginForm(){
  const form = document.getElementById('login-form');
  if(!form) return;
  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    const u = document.getElementById('login-username').value.trim();
    const p = document.getElementById('login-password').value.trim();
    if(staffLogin(u,p)){
      alert('Staff logged in');
      updateNavbarAndPanels();
      window.location.href = 'issue.html';
    } else alert('Invalid staff credentials');
  });
}

function setupStudentSignupForm(){
  const form = document.getElementById('student-signup-form');
  if(!form) return;
  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    const id = document.getElementById('signup-stud-id').value.trim();
    const name = document.getElementById('signup-stud-name').value.trim();
    const email = document.getElementById('signup-stud-email').value.trim();
    const pass = document.getElementById('signup-stud-pass').value;
    const res = studentRegister(id, name, email, pass);
    if(!res.ok) return alert(res.msg);
    alert('Student account created — please login');
    window.location.href = 'student-login.html';
  });
}

function setupStudentLoginForm(){
  const form = document.getElementById('student-login-form');
  if(!form) return;
  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    const id = document.getElementById('login-stud-id').value.trim();
    const pass = document.getElementById('login-stud-pass').value;
    const acc = studentAuthenticate(id, pass);
    if(!acc) return alert('Invalid Student ID or password');
    // mutual-exclusive
    clearStaffSession();
    setStudentSession({ id: acc.id, name: acc.name });
    alert('Student logged in');
    // redirect students to issue page (auto-redirect behaviour)
    window.location.href = 'issue.html';
  });
}

function setupIssueStaffForms(){
  const issueForm = document.getElementById('issue-form');
  if(issueForm){
    issueForm.addEventListener('submit', (e)=>{
      e.preventDefault();
      if(!isStaffLogged()){ alert('Staff login required'); window.location.href='login.html'; return; }
      const sid = document.getElementById('f-student-id').value.trim();
      const sname = document.getElementById('f-student-name').value.trim();
      const isbn = document.getElementById('f-book-isbn').value.trim();
      if(!sid || !sname || !isbn) return alert('Fill all fields');
      // allow lookup by id or isbn
      const books = getBooks();
      const book = books.find(b=>b.id===isbn || b.isbn===isbn);
      if(!book) return alert('Book not found');
      if(book.status !== 'Available') return alert('Book not available');
      const issuedRes = issueBookToStudent(book.id, sid, sname);
      if(!issuedRes.ok) return alert(issuedRes.msg);
      alert('Issued (staff)');
      renderBooksIfPresent();
      renderIssuedStaffTableIfPresent();
    });
  }

  const returnForm = document.getElementById('return-form');
  if(returnForm){
    returnForm.addEventListener('submit', (e)=>{
      e.preventDefault();
      if(!isStaffLogged()){ alert('Staff login required'); window.location.href='login.html'; return; }
      const sid = document.getElementById('r-student-id').value.trim();
      const isbn = document.getElementById('r-book-isbn').value.trim();
      if(!sid || !isbn) return alert('Fill both fields');
      const books = getBooks();
      const book = books.find(b=>b.id===isbn || b.isbn===isbn);
      if(!book) return alert('Book not found');
      // find issued record
      const idx = getIssued().findIndex(x=> x.bookId===book.id && x.studentId===sid);
      if(idx === -1) return alert('Issued record not found');
      // do return
      approveReturn(book.id, sid);
      alert('Returned (staff)');
      renderIssuedStaffTableIfPresent();
      renderBooksIfPresent();
      renderReturnRequestsIfPresent();
      renderStudentIssuedTableIfPresent();
    });
  }
}

/* Logout buttons wiring */
function setupLogoutButtons(){
  const sBtn = document.getElementById('student-logout-btn');
  const stBtn = document.getElementById('logout-btn');
  if(sBtn) sBtn.addEventListener('click', ()=>{ clearStudentSession(); updateNavbarAndPanels(); window.location.href='index.html'; });
  if(stBtn) stBtn.addEventListener('click', ()=>{ clearStaffSession(); updateNavbarAndPanels(); window.location.href='index.html'; });
}

/* -------------------- DOMContentLoaded: initialize -------------------- */
document.addEventListener('DOMContentLoaded', ()=>{
  initializeIfNeeded();
  updateNavbarAndPanels();
  setupLogoutButtons();

  // render books if present
  renderBooksIfPresent();

  // forms
  setupStaffLoginForm();
  setupStudentSignupForm();
  setupStudentLoginForm();
  setupIssueStaffForms();

  // render issued/requests depending on page
  renderIssuedStaffTableIfPresent();
  renderReturnRequestsIfPresent();
  renderStudentIssuedTableIfPresent();
});
