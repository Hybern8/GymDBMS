async function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    const res = await fetch('/staff/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    if (res.ok) {
        document.getElementById('loginBox').style.display = "none";
        document.getElementById('app').style.display = "block";
    } else {
        alert(data.error);
    }
}

async function logout() {
    await fetch('/staff/logout', { method: 'POST' });
    location.reload();
}

async function addUser() {
    const full_name = document.getElementById('full_name').value;
    const phone = document.getElementById('phone').value;
    const email = document.getElementById('email').value;
    const gender = document.getElementById('gender').value;
    const membership = document.getElementById('membership').value;

    const res = await fetch('/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name, phone, email, gender, membership })
    });

    const data = await res.json();
    alert(data.message);
}

let selectedUserId = null;

// Search and populate dropdown
async function searchUsers() {
    const query = document.getElementById('search').value;
    const dropdown = document.getElementById('searchDropdown');
    dropdown.innerHTML = '';
    selectedUserId = null;

    if (query.length < 2) return; // wait until user types 2+ chars

    const res = await fetch(`/search?q=${encodeURIComponent(query)}`);
    const users = await res.json();

    if (users.length === 0) {
        const opt = document.createElement('option');
        opt.text = "No matches found";
        opt.disabled = true;
        dropdown.add(opt);
        return;
    }

    // Placeholder option
    const placeholder = document.createElement('option');
    placeholder.text = "-- Select Member --";
    placeholder.disabled = true;
    placeholder.selected = true;
    dropdown.add(placeholder);

    // Add each user
    users.forEach(user => {
        const opt = document.createElement('option');
        opt.value = user.Id;
        opt.text = `${user.FullName} (${user.Membership || 'None'})`;
        dropdown.add(opt);
    });
}

// When a user is chosen
function selectUser() {
    const dropdown = document.getElementById('searchDropdown');
    selectedUserId = dropdown.value;
}

// Log a visit
async function logVisit() {
    const amount = document.getElementById('amount').value;
    if (!selectedUserId) return alert("Please select a member first");
    if (!amount) return alert("Enter amount");

    const res = await fetch('/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: selectedUserId, amount })
    });

    const data = await res.json();
    if (res.ok) {
        alert(`Visit logged (Visit ID: ${data.visit_id})`);
    } else {
        alert(data.error);
    }
}

function exportVisitsCSV() {
    if (!window.lastVisitsData || window.lastVisitsData.length === 0) {
        alert("No visits data to export.");
        return;
    }

    // Prepare CSV header
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Full Name,Membership,Amount,Visit Date,Staff\n";

    // Add rows
    window.lastVisitsData.forEach(v => {
        let row = [
            `"${v.FullName}"`,
            `"${v.Membership}"`,
            v.Amount,
            new Date(v.VisitDate).toLocaleString(),
            `"${v.StaffUsername}"`
        ].join(",");
        csvContent += row + "\n";
    });

    // Trigger download
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `visits_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

async function loadVisits() {
    const start = document.getElementById('start_date').value;
    const end = document.getElementById('end_date').value;

    const res = await fetch(`/visits?start=${start}&end=${end}`);
    const data = await res.json();

    // Save visits for export
    window.lastVisitsData = data.visits;

    const list = document.getElementById('visitsList');
    const totalsDiv = document.getElementById('totals');
    list.innerHTML = '';
    totalsDiv.innerHTML = '';

    if (data.visits.length === 0) {
        list.innerHTML = "<p>No visits found</p>";
    } else {
        // Create table
        const table = document.createElement('table');
        table.style.width = "100%";
        table.style.borderCollapse = "collapse";
        table.innerHTML = `
            <thead>
                <tr>
                    <th style="border:1px solid #ccc; padding:5px;">Name</th>
                    <th style="border:1px solid #ccc; padding:5px;">Amount</th>
                    <th style="border:1px solid #ccc; padding:5px;">Membership</th>
                    <th style="border:1px solid #ccc; padding:5px;">Visit Date</th>
                    <th style="border:1px solid #ccc; padding:5px;">Staff</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;

        const tbody = table.querySelector('tbody');

        data.visits.forEach(v => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="border:1px solid #ccc; padding:5px;">${v.FullName}</td>
                <td style="border:1px solid #ccc; padding:5px;">₦${v.Amount}</td>
                <td style="border:1px solid #ccc; padding:5px;">${v.Membership}</td>
                <td style="border:1px solid #ccc; padding:5px;">${new Date(v.VisitDate).toLocaleString()}</td>
                <td style="border:1px solid #ccc; padding:5px;">${v.StaffUsername}</td>
            `;
            tbody.appendChild(tr);
        });

        list.appendChild(table);
    }

    totalsDiv.textContent = `Total Entries: ${data.totals.TotalEntries} | Total Revenue: ₦${data.totals.TotalRevenue}`;
}
// Register new staff with validation
async function registerStaff() {
    const fullname = document.getElementById('staff_fullname')?.value.trim();
    const gender = document.getElementById('staff_gender')?.value.trim();
    const email = document.getElementById('staff_email')?.value.trim();
    const username = document.getElementById('staff_username')?.value.trim();
    const password = document.getElementById('staff_password')?.value.trim();
    const btn = document.getElementById('registerStaffBtn');

    if (!fullname || !gender || !email || !username || !password) {
        alert('Please enter all values.');
        return;
    }

    if (btn) btn.disabled = true;
    try {
        const res = await fetch('/staff/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fullname, gender, email, username, password })
        });

        // try to read JSON response (safe fallback)
        let data = {};
        try { data = await res.json(); } catch (e) {}

        if (!res.ok) {
            const err = data.error || data.message || `Server returned ${res.status}`;
            alert('Registration failed: ' + err);
            return;
        }

        alert(data.message || 'Staff registered successfully.');
        // clear inputs
        if (document.getElementById('staff_fullname')) document.getElementById('staff_fullname').value = '';
        if (document.getElementById('staff_gender')) document.getElementById('staff_gender').value = '';
        if (document.getElementById('staff_email')) document.getElementById('staff_email').value = '';
        if (document.getElementById('staff_username')) document.getElementById('staff_username').value = '';
        if (document.getElementById('staff_password')) document.getElementById('staff_password').value = '';

        // refresh users list if it's visible / loaded
        if (typeof loadUsers === 'function') loadUsers();
    } catch (err) {
        console.error('Error registering staff:', err);
        alert('Failed to register staff. See console for details.');
    } finally {
        if (btn) btn.disabled = false;
    }
}

// Load Members list on demand
async function loadUsers() {
    try {
        const res = await fetch("/users");
        const users = await res.json();

        const list = document.getElementById("usersList");
        list.innerHTML = "";

        if (users.length === 0) {
            list.innerHTML = "<p>No staff found.</p>";
        } else {
            const table = document.createElement("table");
            table.style.width = "100%";
            table.style.borderCollapse = "collapse";
            table.innerHTML = `
                <thead>
                    <tr>
                        <th style="border:1px solid #ccc; padding:5px;">Full Name</th>
                        <th style="border:1px solid #ccc; padding:5px;">Phone</th>
                        <th style="border:1px solid #ccc; padding:5px;">Email</th>
                        <th style="border:1px solid #ccc; padding:5px;">Membership</th>
                    </tr>
                </thead>
                <tbody></tbody>
            `;

            const tbody = table.querySelector("tbody");

            users.forEach(u => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td style="border:1px solid #ccc; padding:5px;">${u.FullName}</td>
                    <td style="border:1px solid #ccc; padding:5px;">${u.Phone || "-"}</td>
                    <td style="border:1px solid #ccc; padding:5px;">${u.Email || "-"}</td>
                    <td style="border:1px solid #ccc; padding:5px;">${u.Membership || "-"}</td>
                `;
                tbody.appendChild(tr);
            });

            list.appendChild(table);
        }
    } catch (err) {
        console.error("Error loading users:", err);
        alert("Failed to load staff.");
    }
}

// Export users list to CSV
function exportUsersToCSV() {
    const table = document.querySelector("#usersList table");
    if (!table) {
        alert("No members data to export. Load members first.");
        return;
    }

    let csv = [];
    const rows = table.querySelectorAll("tr");

    rows.forEach(row => {
        const cols = row.querySelectorAll("td, th");
        let rowData = [];
        cols.forEach(col => rowData.push(`"${col.innerText}"`));
        csv.push(rowData.join(","));
    });

    const csvContent = "data:text/csv;charset=utf-8," + csv.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "members_list.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Load all staff from DB
async function loadStaff() {
    try {
        const res = await fetch("/staff"); // <-- you already have/need this route in server.js
        const staff = await res.json();

        const container = document.getElementById("staffList");
        container.innerHTML = "";

        if (!staff.length) {
            container.innerHTML = "<p>No staff found.</p>";
            return;
        }

        // Create table
        const table = document.createElement("table");
        table.border = "1";
        table.style.width = "100%";
        table.style.borderCollapse = "collapse";
        table.style.marginTop = "10px";

        // Table header
        const thead = document.createElement("thead");
        thead.innerHTML = `
            <tr>
                <th style="padding:8px; text-align:left;">Full Name</th>
                <th style="padding:8px; text-align:left;">Gender</th>
                <th style="padding:8px; text-align:left;">Username</th>
            </tr>
        `;
        table.appendChild(thead);

        // Table body
        const tbody = document.createElement("tbody");
        staff.forEach(s => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td style="padding:8px;">${s.FullName}</td>
                <td style="padding:8px;">${s.Gender || "-"}</td>
                <td style="padding:8px;">${s.Username}</td>
            `;
            tbody.appendChild(row);
        });
        table.appendChild(tbody);

        container.appendChild(table);

    } catch (err) {
        console.error("Error loading staff:", err);
        alert("Failed to load staff.");
    }
}

// Export staff as CSV
function exportStaffCSV() {
    const table = document.querySelector("#staffList table");
    if (!table) {
        alert("No staff data to export.");
        return;
    }

    const rows = [];
    // Get header row
    const headers = Array.from(table.querySelectorAll("thead th")).map(th => th.textContent);
    rows.push(headers);

    // Get table body rows
    table.querySelectorAll("tbody tr").forEach(tr => {
        const row = Array.from(tr.querySelectorAll("td")).map(td => td.textContent);
        rows.push(row);
    });

    // Convert to CSV
    let csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", "staff.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}