async function addUser() {
    const full_name = document.getElementById('full_name').value;
    const phone = document.getElementById('phone').value;
    const email = document.getElementById('email').value;

    const res = await fetch('/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name, phone, email })
    });

    const data = await res.json();
    alert(data.message);
}

// Search users and display results
async function searchUsers() {
    const query = document.getElementById('search').value;
    const list = document.getElementById('searchResults');
    list.innerHTML = '';

    if (query.length < 2) return;

    const res = await fetch(`/search?q=${encodeURIComponent(query)}`);
    const users = await res.json();

    users.forEach(user => {
        const li = document.createElement('li');
        li.innerHTML = `${user.FullName} (${user.Phone || 'No phone'}) 
                        <button onclick="logVisitFromSearch(${user.Id})">Log Visit</button>`;
        list.appendChild(li);
    });
}

async function logVisitFromSearch(user_id) {
    const amount = document.getElementById('amount').value;
    if (!amount) {
        alert("Please enter the amount paid.");
        return;
    }

    const res = await fetch('/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id, amount })
    });

    const data = await res.json();
    alert(`Visit logged for User ID: ${user_id} (Visit ID: ${data.visit_id})`);
}

async function loadVisits() {
    const start = document.getElementById('start_date').value;
    const end = document.getElementById('end_date').value;
    const list = document.getElementById('visitsList');
    const totalsDiv = document.getElementById('totals');

    list.innerHTML = '';
    totalsDiv.innerHTML = '';

    if (!start || !end) {
        alert("Please select both start and end dates.");
        return;
    }

    const res = await fetch(`/visits?start=${start}&end=${end}`);
    const data = await res.json();

    const visits = data.visits;
    const totals = data.totals;

    if (visits.length === 0) {
        list.innerHTML = "<li>No visits found for this period.</li>";
    } else {
        visits.forEach(visit => {
            const li = document.createElement('li');
            li.textContent = `${visit.FullName} - ₦${visit.Amount} - ${new Date(visit.VisitDate).toLocaleString()}`;
            list.appendChild(li);
        });
    }

    // Show totals
    totalsDiv.textContent = `Total Entries: ${totals.TotalEntries} | Total Revenue: ₦${totals.TotalRevenue}`;
}
