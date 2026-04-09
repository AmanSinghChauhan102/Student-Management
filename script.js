 // ============================================
        // THEME MANAGEMENT - Fixed Position
        // ============================================
        const themeToggle = document.getElementById('themeToggle');
        const themeIcon = document.getElementById('themeIcon');
        const themeText = document.getElementById('themeText');

        function toggleTheme() {
            const html = document.documentElement;
            const currentTheme = html.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

            html.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateThemeUI(newTheme);
        }

        function updateThemeUI(theme) {
            if (theme === 'dark') {
                themeIcon.className = 'fas fa-sun';
                themeText.textContent = 'Light Mode';
            } else {
                themeIcon.className = 'fas fa-moon';
                themeText.textContent = 'Dark Mode';
            }
        }

        // Initialize theme
        const savedTheme = localStorage.getItem('theme');
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const initialTheme = savedTheme || (systemDark ? 'dark' : 'light');

        document.documentElement.setAttribute('data-theme', initialTheme);
        updateThemeUI(initialTheme);
        window.toggleTheme = toggleTheme;

        // ============================================
        // SEMESTER SELECTOR
        // ============================================
        function initSemesterSelector() {
            const container = document.getElementById('semesterSelector');
            const semesterInput = document.getElementById('semester');

            for (let i = 1; i <= 8; i++) {
                const option = document.createElement('div');
                option.className = 'semester-option' + (i === 1 ? ' active' : '');
                option.textContent = i;
                option.dataset.semester = i;

                option.addEventListener('click', () => {
                    document.querySelectorAll('.semester-option').forEach(opt => {
                        opt.classList.remove('active');
                    });
                    option.classList.add('active');
                    semesterInput.value = i;
                });

                container.appendChild(option);
            }
        }

        initSemesterSelector();

        // ============================================
        // FIREBASE & APP LOGIC
        // ============================================
        const STORAGE_AUTH_KEY = 'bca_loggedIn';
        const VALID_USER = { id: "admin", password: "1234" };

        import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
        import {
            getFirestore, collection, addDoc, getDocs, deleteDoc,
            doc, updateDoc, setDoc
        } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

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

        let students = [];
        let customFields = [];
        let editingId = null;
        let currentSearch = "";

        // DOM Elements
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
        const studentCountDisplay = document.getElementById('studentCountDisplay');
        const clearSearchBtn = document.getElementById('clearSearchBtn');
        const exportExcelBtn = document.getElementById('exportExcelBtn');
        const globalMessage = document.getElementById('globalMessage');

        // Auth
        function checkAuth() {
            if (sessionStorage.getItem(STORAGE_AUTH_KEY) === 'true') {
                loginSection.style.display = "none";
                dashboardSection.style.display = "block";
                loadAll();
            } else {
                loginSection.style.display = "flex";
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
        loginPassword.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') login();
        });

        // Load Data
        async function loadAll() {
            try {
                const snap = await getDocs(collection(db, "students"));
                students = snap.docs.map(d => ({ id: d.id, ...d.data() }));

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
                updateStudentCount();
                showMessage('Data loaded successfully', 'success');
            } catch (error) {
                showMessage('Error loading data', 'error');
            }
        }

        // Custom Fields
        async function saveFields() {
            await setDoc(doc(db, "config", "fields"), { fields: customFields });
        }

        function renderCustomFields() {
            customFieldsListDiv.innerHTML = customFields.map(f =>
                `<div class="field-tag">
                    <i class="fas fa-tag"></i> ${f}
                    <button onclick="window.removeField('${f}')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>`
            ).join("");
        }

        window.removeField = async function (name) {
            if (!confirm(`Delete field "${name}"?`)) return;
            customFields = customFields.filter(f => f !== name);
            await saveFields();
            loadAll();
        }

        window.addField = async function () {
            const val = document.getElementById("newFieldName").value.trim();
            if (!val) return showMessage('Enter field name', 'warning');
            if (customFields.includes(val)) return showMessage('Field already exists', 'warning');

            customFields.push(val);
            await saveFields();
            document.getElementById("newFieldName").value = '';
            loadAll();
            showMessage(`Field "${val}" added`, 'success');
        }

        // Dynamic Inputs
        function renderDynamicInputs() {
            dynamicFieldsContainer.innerHTML = customFields.map(f => `
                <div class="form-field">
                    <label><i class="fas fa-pencil-alt"></i> ${f}</label>
                    <input type="text" data-field="${f}" placeholder="Enter ${f.toLowerCase()}">
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

        // Add/Update
        async function handleAddUpdate() {
            const rollNo = rollNoInput.value.trim();
            const name = fullNameInput.value.trim();
            const semester = parseInt(semesterInput.value);
            const gender = genderInput.value;
            const dob = dobInput.value;
            const customData = getDynamicValues();

            if (!rollNo || !name) {
                showMessage('Roll Number and Name are required', 'warning');
                return;
            }

            try {
                if (!editingId) {
                    await addDoc(collection(db, "students"), {
                        rollNo, name, semester, department: "BCA", gender, dob, customData
                    });
                    showMessage('Student added successfully', 'success');
                } else {
                    await updateDoc(doc(db, "students", editingId), {
                        rollNo, name, semester, gender, dob, customData
                    });
                    editingId = null;
                    showMessage('Student updated successfully', 'success');
                }

                resetForm();
                loadAll();
            } catch (error) {
                showMessage('Error saving student', 'error');
            }
        }

        // Delete
        window.deleteStudent = async function (id) {
            if (!confirm("Are you sure you want to delete this student?")) return;
            try {
                await deleteDoc(doc(db, "students", id));
                showMessage('Student deleted', 'success');
                loadAll();
            } catch (error) {
                showMessage('Error deleting student', 'error');
            }
        }

        // Edit
        window.editStudent = function (id) {
            const s = students.find(x => x.id === id);
            if (!s) return;

            rollNoInput.value = s.rollNo;
            fullNameInput.value = s.name;
            semesterInput.value = s.semester;
            genderInput.value = s.gender || "";
            dobInput.value = s.dob || "";

            document.querySelectorAll('.semester-option').forEach(opt => {
                opt.classList.remove('active');
                if (parseInt(opt.dataset.semester) === s.semester) {
                    opt.classList.add('active');
                }
            });

            editingId = id;
            renderDynamicInputs();

            setTimeout(() => {
                document.querySelectorAll('[data-field]').forEach(inp => {
                    inp.value = s.customData?.[inp.dataset.field] || "";
                });
            }, 100);

            addUpdateBtn.innerHTML = '<i class="fas fa-save"></i> Update Student';
            cancelEditBtn.style.display = 'inline-flex';
        }

        // Search
        searchInput.addEventListener("input", () => {
            currentSearch = searchInput.value.toLowerCase();
            renderTable();
            updateStudentCount();
        });

        clearSearchBtn.addEventListener('click', () => {
            searchInput.value = '';
            currentSearch = '';
            renderTable();
            updateStudentCount();
        });

        // Table
        function renderTable() {
            let filtered = students.filter(s =>
                s.name.toLowerCase().includes(currentSearch) ||
                s.rollNo.toLowerCase().includes(currentSearch)
            );

            let header = `
                <tr>
                    <th>Roll</th>
                    <th>Name</th>
                    <th>Gender</th>
                    <th>DOB</th>
                    <th>Sem</th>
                    <th>Dept</th>
                    ${customFields.map(f => `<th>${f}</th>`).join("")}
                    <th>Actions</th>
                </tr>`;
            tableHeader.innerHTML = header;

            if (filtered.length === 0) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="${7 + customFields.length}" class="empty-state">
                            <i class="fas fa-inbox"></i>
                            <div>No students found</div>
                        </td>
                    </tr>`;
                return;
            }

            tableBody.innerHTML = filtered.map(s => `
                <tr>
                    <td><strong>${s.rollNo}</strong></td>
                    <td>${s.name}</td>
                    <td>${s.gender || "—"}</td>
                    <td>${s.dob ? new Date(s.dob).toLocaleDateString() : "—"}</td>
                    <td><span class="semester-badge">Sem ${s.semester}</span></td>
                    <td>BCA</td>
                    ${customFields.map(f => `<td>${s.customData?.[f] || "—"}</td>`).join("")}
                    <td>
                        <div class="table-actions">
                            <button class="icon-btn edit-btn" onclick="editStudent('${s.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="icon-btn delete-btn" onclick="deleteStudent('${s.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join("");
        }

        function updateStudentCount() {
            let filtered = students.filter(s =>
                s.name.toLowerCase().includes(currentSearch) ||
                s.rollNo.toLowerCase().includes(currentSearch)
            );
            studentCountDisplay.innerHTML = `<i class="fas fa-users"></i> Total: ${filtered.length}`;
        }

        function resetForm() {
            rollNoInput.value = "";
            fullNameInput.value = "";
            semesterInput.value = "1";
            genderInput.value = "";
            dobInput.value = "";
            document.querySelectorAll('.semester-option').forEach((opt, i) => {
                opt.classList.toggle('active', i === 0);
            });
            renderDynamicInputs();
            addUpdateBtn.innerHTML = '<i class="fas fa-plus-circle"></i> Add Student';
            cancelEditBtn.style.display = 'none';
        }

        function showMessage(text, type = 'info') {
            globalMessage.innerHTML = text;
            globalMessage.style.background = type === 'success' ? 'rgba(16, 185, 129, 0.1)' :
                type === 'error' ? 'rgba(239, 68, 68, 0.1)' :
                    'rgba(59, 130, 246, 0.1)';
            globalMessage.style.color = type === 'success' ? 'var(--accent-success)' :
                type === 'error' ? 'var(--accent-danger)' :
                    'var(--accent-primary)';

            setTimeout(() => {
                globalMessage.innerHTML = '';
            }, 3000);
        }

        // Export Excel
        exportExcelBtn.addEventListener('click', () => {
            let filtered = students.filter(s =>
                s.name.toLowerCase().includes(currentSearch) ||
                s.rollNo.toLowerCase().includes(currentSearch)
            );

            const data = filtered.map(s => ({
                'Roll No': s.rollNo,
                'Name': s.name,
                'Gender': s.gender || '',
                'DOB': s.dob || '',
                'Semester': s.semester,
                'Department': 'BCA',
                ...Object.fromEntries(customFields.map(f => [f, s.customData?.[f] || '']))
            }));

            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Students");
            XLSX.writeFile(wb, `BCA_Students_${new Date().toISOString().split('T')[0]}.xlsx`);
            showMessage('Excel file exported', 'success');
        });

        // Event Listeners
        addUpdateBtn.addEventListener("click", handleAddUpdate);
        document.getElementById("addFieldBtn").addEventListener("click", window.addField);
        cancelEditBtn.addEventListener('click', () => {
            resetForm();
            editingId = null;
        });

        // Make functions global
        window.editStudent = window.editStudent;
        window.deleteStudent = window.deleteStudent;
        window.removeField = window.removeField;
        window.addField = window.addField;

        // Initialize
        checkAuth();