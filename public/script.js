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
        list.innerHTML = "<li>No visits found</li>";
    } else {
        data.visits.forEach(v => {
            const li = document.createElement('li');
            li.textContent = `${v.FullName} - ₦${v.Amount} - ${v.Membership} - ${new Date(v.VisitDate).toLocaleString()} (by ${v.StaffUsername})`;
            list.appendChild(li);
        });
    }

    totalsDiv.textContent = `Total Entries: ${data.totals.TotalEntries} | Total Revenue: ₦${data.totals.TotalRevenue}`;
}
