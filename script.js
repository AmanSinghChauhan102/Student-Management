const STORAGE_AUTH_KEY = 'bca_loggedIn';
const VALID_USER = { id: "admin", password: "imagine@cl" };
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import {
    getFirestore, collection, addDoc, getDocs, deleteDoc,
    doc, updateDoc, setDoc
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

// 🔥 Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyCXKE0Df9tS6T01Omyn7XRws8iZ_BVDiio",
    authDomain: "college-project-f2278.firebaseapp.com",
    projectId: "college-project-f2278",
    storageBucket: "college-project-f2278.firebasestorage.app",
    messagingSenderId: "300643718822",
    appId: "1:300643718822:web:32391d919273518d250667"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ---------------- GLOBAL ----------------
let students = [];
let customFields = [];
let editingId = null;
let currentSearch = "";

// ---------------- DOM ----------------
const tableBody = document.getElementById('tableBody');
const tableHeader = document.getElementById('tableHeader');
const rollNoInput = document.getElementById('rollNo');
const fullNameInput = document.getElementById('fullName');
const semesterInput = document.getElementById('semester');
const addUpdateBtn = document.getElementById('addUpdateBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const searchInput = document.getElementById('searchInput');
const customFieldsListDiv = document.getElementById('customFieldsList');
const dynamicFieldsContainer = document.getElementById('dynamicFieldsContainer');
const loginSection = document.getElementById('loginSection');
const dashboardSection = document.getElementById('dashboardSection');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const loginUserId = document.getElementById('loginUserId');
const loginPassword = document.getElementById('loginPassword');
const loginErrorMsg = document.getElementById('loginErrorMsg');
const genderInput = document.getElementById('gender');
const dobInput = document.getElementById('dob');

function checkAuth() {
    if (sessionStorage.getItem(STORAGE_AUTH_KEY) === 'true') {
        loginSection.style.display = "none";
        dashboardSection.style.display = "block";
        loadAll(); // 🔥 important
    } else {
        loginSection.style.display = "block";
        dashboardSection.style.display = "none";
    }
}

function login() {
    const uid = loginUserId.value.trim();
    const pwd = loginPassword.value.trim();

    if (uid === VALID_USER.id && pwd === VALID_USER.password) {
        sessionStorage.setItem(STORAGE_AUTH_KEY, 'true');
        loginErrorMsg.style.display = "none";
        checkAuth();
    } else {
        loginErrorMsg.style.display = "block";
    }
}

function logout() {
    sessionStorage.removeItem(STORAGE_AUTH_KEY);
    checkAuth();
}
loginBtn.addEventListener("click", login);
logoutBtn.addEventListener("click", logout);

// ---------------- LOAD DATA ----------------
async function loadAll() {
    // students
    const snap = await getDocs(collection(db, "students"));
    students = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    // custom fields (single doc)
    const fieldSnap = await getDocs(collection(db, "config"));
    if (!fieldSnap.empty) {
        customFields = fieldSnap.docs[0].data().fields || [];
    } else {
        customFields = ["Email", "Phone", "Address"];
        await setDoc(doc(db, "config", "fields"), { fields: customFields });
    }

    renderCustomFields();
    renderDynamicInputs();
    renderTable();
}

// ---------------- CUSTOM FIELDS ----------------
async function saveFields() {
    await setDoc(doc(db, "config", "fields"), { fields: customFields });
}

function renderCustomFields() {
    customFieldsListDiv.innerHTML = customFields.map(f =>
        `<div class="field-tag">${f}
      <button onclick="window.removeField('${f}')">✖</button>
    </div>`
    ).join("");
}

window.removeField = async function (name) {
    if (!confirm("Delete field?")) return;
    customFields = customFields.filter(f => f !== name);
    await saveFields();
    loadAll();
}

window.addField = async function () {
    const val = document.getElementById("newFieldName").value.trim();
    if (!val) return alert("Enter field name");
    if (customFields.includes(val)) return alert("Already exists");

    customFields.push(val);
    await saveFields();
    loadAll();
}

// ---------------- DYNAMIC INPUTS ----------------
function renderDynamicInputs() {
    dynamicFieldsContainer.innerHTML = customFields.map(f => `
    <div class="form-field">
      <label>${f}</label>
      <input type="text" data-field="${f}">
    </div>
  `).join("");
}

function getDynamicValues() {
    const data = {};
    document.querySelectorAll('[data-field]').forEach(inp => {
        data[inp.dataset.field] = inp.value;
    });
    return data;
}

// ---------------- ADD / UPDATE ----------------
async function handleAddUpdate() {
    const rollNo = rollNoInput.value.trim();
    const name = fullNameInput.value.trim();
    const semester = parseInt(semesterInput.value);
    const gender = genderInput.value;
    const dob = dobInput.value;
    const customData = getDynamicValues();

    if (!rollNo || !name) return alert("Fill required");

    if (!editingId) {
        await addDoc(collection(db, "students"), {
            rollNo, name, semester, department: "BCA", gender, dob, customData
        });
    } else {
        await updateDoc(doc(db, "students", editingId), {
            rollNo, name, semester, gender, dob, customData
        });
        editingId = null;
    }

    resetForm();
    loadAll();
}

// ---------------- DELETE ----------------
window.deleteStudent = async function (id) {
    if (!confirm("Delete?")) return;
    await deleteDoc(doc(db, "students", id));
    loadAll();
}

// ---------------- EDIT ----------------
window.editStudent = function (id) {
    const s = students.find(x => x.id === id);
    if (!s) return;

    rollNoInput.value = s.rollNo;
    fullNameInput.value = s.name;
    semesterInput.value = s.semester;
    genderInput.value = s.gender || "";
    dobInput.value = s.dob || "";

    editingId = id;
    renderDynamicInputs();

    // fill dynamic
    setTimeout(() => {
        document.querySelectorAll('[data-field]').forEach(inp => {
            inp.value = s.customData?.[inp.dataset.field] || "";
        });
    });

    addUpdateBtn.innerText = "Update";
    cancelEditBtn.style.display = "inline-block";
}

// ---------------- SEARCH ----------------
searchInput.addEventListener("input", () => {
    currentSearch = searchInput.value.toLowerCase();
    renderTable();
});

// ---------------- TABLE ----------------
function renderTable() {
    let filtered = students.filter(s =>
        s.name.toLowerCase().includes(currentSearch) ||
        s.rollNo.toLowerCase().includes(currentSearch)
    );

    let header = `
    <tr>
      <th>Roll</th><th>Name</th><th>Gender</th><th>DOB</th><th>Sem</th><th>Dept</th>
      ${customFields.map(f => `<th>${f}</th>`).join("")}
      <th>Actions</th>
    </tr>`;
    tableHeader.innerHTML = header;

    tableBody.innerHTML = filtered.map(s => `
    <tr>
      <td>${s.rollNo}</td>
      <td>${s.name}</td>
      <td>${s.semester}</td>
      <td>${s.gender || ""}</td>
      <td>${s.dob ? new Date(s.dob).toLocaleDateString() : ""}</td>
      
      <td>BCA</td>
      ${customFields.map(f => `<td>${s.customData?.[f] || ""}</td>`).join("")}
      <td>
        <button onclick="editStudent('${s.id}')">✏️</button>
        <button onclick="deleteStudent('${s.id}')">🗑️</button>
      </td>
    </tr>
  `).join("");
}

// ---------------- RESET ----------------
function resetForm() {
    rollNoInput.value = "";
    fullNameInput.value = "";
    semesterInput.value = "1";
    genderInput.value = "";
    dobInput.value = "";
    renderDynamicInputs();
    addUpdateBtn.innerText = "➕ Add Student";
    cancelEditBtn.style.display = "none";
}

// ---------------- EVENTS ----------------
addUpdateBtn.addEventListener("click", handleAddUpdate);
document.getElementById("addFieldBtn").addEventListener("click", window.addField);

// ---------------- INIT ----------------
checkAuth();