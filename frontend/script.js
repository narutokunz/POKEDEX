

//const API_BASE_URL = 'http://localhost:5000/api'; 
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api' 
    : '/api';
const STREAK_THRESHOLD = 5;

// --- DATE HELPER UTILITIES (CRITICAL FIXES HERE) ---

// Helper to normalize any Date object to a YYYY-MM-DD string
// *** Uses LOCAL getters to match the browser's date perfectly ***
const normalizeDateString = (date) => {
    if (!date || isNaN(date.getTime())) return null;
    
    // Use local time getters to ensure the date matches the user's system date (e.g., Nov 22nd)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
};

// Helper to find the last completed date from the history (Returns a Date object)
const getLastCompletedDate = (history) => {
    if (!history || history.length === 0) return null;
    
    // Parse all dates and sort descending
    const parsedHistory = history.map(dateStr => new Date(dateStr)).filter(date => !isNaN(date.getTime()));
    if (parsedHistory.length === 0) return null;
    
    const sortedHistory = [...parsedHistory].sort((a, b) => b.getTime() - a.getTime());
    
    // Returns the latest Date object
    return sortedHistory[0];
};

// --- AUTH UTILITIES ---
function saveToken(token) {
    localStorage.setItem('userToken', token);
}

function getToken() {
    return localStorage.getItem('userToken');
}

function redirectToDashboard() {
    window.location.href = 'dashboard.html';
}

function redirectToLogin() {
    localStorage.removeItem('userToken');
    window.location.href = 'login.html';
}

function logout() {
    if (confirm("Are you sure you want to log out, Trainer?")) {
        redirectToLogin();
    }
}

// --- AUTH CHECK & LOAD (For Dashboard) ---
function checkAuthAndLoad() {
    if (!getToken()) {
        redirectToLogin();
        return;
    }
    fetchHabits();
}

// --- CALENDAR STATE ---
let currentCalendarDate = new Date();
let allHabits = []; 

// --- HABIT FETCHING ---
async function fetchHabits() {
    const token = getToken();
    if (!token) return redirectToLogin();
    
    try {
        const response = await fetch(`${API_BASE_URL}/habits`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const habits = await response.json();

        if (response.ok) {
            allHabits = habits; 
            renderHabits(habits);
            renderCalendar(currentCalendarDate); 
            checkStreakReward(habits); 
            displayCalendarReminder(habits); 
        } else {
            console.error('Failed to fetch habits:', habits.message);
            if (response.status === 401) {
                 alert('Session expired. Please log in again.');
                 redirectToLogin();
            }
        }
    } catch (error) {
        console.error("Network or server error during habit fetch:", error);
    }
}

// --- NEW: CALENDAR REMINDER LOGIC (RIGHT PANEL) ---
function displayCalendarReminder(habits) {
    const reminderElement = document.getElementById('calendarReminder');
    if (!reminderElement) return;

    const todayString = normalizeDateString(new Date());
    let allCompleted = true;
    let totalHabits = habits.length;

    if (totalHabits === 0) {
        reminderElement.innerHTML = '<p class="reminder-success"><i class="fas fa-magic"></i> Start tracking your first habit!</p>';
        return;
    }

    habits.forEach(habit => {
        const lastCompletedDate = getLastCompletedDate(habit.completionHistory);
        const isCompletedToday = lastCompletedDate ? normalizeDateString(lastCompletedDate) === todayString : false;
        
        if (!isCompletedToday) {
            allCompleted = false;
        }
    });

    if (allCompleted) {
        reminderElement.innerHTML = `
            <p class="reminder-success">
                <i class="fas fa-trophy"></i> All ${totalHabits} habits completed for today! Great work!
            </p>
        `;
    } else {
        const remaining = habits.filter(h => {
            const lastCompletedDate = getLastCompletedDate(h.completionHistory);
            return !(lastCompletedDate ? normalizeDateString(lastCompletedDate) === todayString : false);
        }).length;

        reminderElement.innerHTML = `
            <p class="reminder-warning">
                <i class="fas fa-bell"></i> You still have <strong>${remaining}</strong> habit(s) left to complete today.
            </p>
        `;
    }
}

// --- POKEMON STREAK LOGIC ---
async function fetchRandomPokemon() {
    const randomId = Math.floor(Math.random() * 898) + 1;
    const apiUrl = `https://pokeapi.co/api/v2/pokemon/${randomId}`;

    try {
        const response = await fetch(apiUrl);
        const data = await response.json();
        const pokemonName = data.name.toUpperCase();
        const pokemonImage = data.sprites.other['official-artwork'].front_default;
        return { name: pokemonName, image: pokemonImage, id: randomId };
    } catch (error) {
        console.error("Failed to fetch Pokémon:", error);
        return { name: 'MISSINGNO', image: 'https://placehold.co/100x100/3b4cca/f7f7f7?text=?', id: 0 };
    }
}

async function checkStreakReward(habits) {
    const pokemonCard = document.getElementById('pokemonCard');
    const messageElement = document.getElementById('streak-reward-message');
    const maxStreakHabit = habits.reduce((max, habit) => 
        (habit.streak > max.streak ? habit : max), { streak: 0 });

    if (maxStreakHabit.streak >= STREAK_THRESHOLD) {
        messageElement.innerHTML = `You earned a new companion for your **${maxStreakHabit.title}** streak!`;
        const pokemonData = await fetchRandomPokemon();
        pokemonCard.innerHTML = `
            <h3>${pokemonData.name}</h3>
            <img src="${pokemonData.image}" alt="${pokemonData.name}" onerror="this.onerror=null;this.src='https://placehold.co/100x100/3b4cca/f7f7f7?text=?'">
            <p><strong>ID: #${pokemonData.id}</strong></p>
        `;
    } else {
        pokemonCard.innerHTML = `
             <img src="https://placehold.co/100x100/DCDCDC/A9A9A9?text=?" alt="Placeholder">
             <p>No Companion Yet</p>
        `;
        messageElement.innerHTML = `Achieve a ${STREAK_THRESHOLD}-day streak to reveal a new Pokémon! Current max streak: ${maxStreakHabit.streak || 0} days.`;
    }
}


// --- RENDER HABITS (FIXED UI Mismatch) ---
function renderHabits(habits) {
    const habitListContainer = document.getElementById('habitList');
    if (!habitListContainer) return;

    habitListContainer.innerHTML = ''; 

    if (habits.length === 0) {
        habitListContainer.innerHTML = '<p style="text-align: center; margin-top: 30px; color: #3b4cca;">Time to create your first habit, Trainer!</p>';
        return;
    }

    // FIX: Get today's normalized date string for reliable comparison
    const todayString = normalizeDateString(new Date());

    habits.forEach(habit => {
        const lastCompletedDate = getLastCompletedDate(habit.completionHistory);
        
        // FIX: Compare normalized date strings
        const isCompletedToday = lastCompletedDate ? normalizeDateString(lastCompletedDate) === todayString : false;

        const habitElement = document.createElement('div');
        habitElement.className = 'habit-item'; 

        const buttonText = isCompletedToday ? '<i class="fas fa-check"></i> Completed Today' : 'Mark Complete';
        const buttonClass = isCompletedToday ? 'btn-complete-done' : 'btn-complete';

        habitElement.innerHTML = `
            <h3>${habit.title}</h3>
            <p>${habit.description || 'No description provided.'}</p>
            <p><strong><i class="fas fa-fire"></i> Streak:</strong> ${habit.streak || 0} days</p>
            <div class="habit-buttons">
                <button 
                    class="btn ${buttonClass}" 
                    ${isCompletedToday ? 'disabled' : ''}
                    onclick="markHabitComplete('${habit._id}')"
                >
                    ${buttonText}
                </button>
                <button class="btn btn-edit" onclick="openEditModal('${habit._id}', '${habit.title}', '${habit.description || ''}')">
                    <i class="fas fa-edit"></i> Edit
                </button>

                <button class="btn btn-delete" onclick="deleteHabit('${habit._id}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        `;

        habitListContainer.appendChild(habitElement);
    });
}


// --- CALENDAR GENERATION LOGIC ---

function changeMonth(delta) {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + delta);
    renderCalendar(currentCalendarDate);
}

function renderCalendar(date) {
    const monthYearSpan = document.getElementById('currentMonthYear');
    const calendarGrid = document.getElementById('calendarGrid');
    if (!calendarGrid) return;
    
    const currentMonth = date.getMonth();
    const currentYear = date.getFullYear();
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const startDayOfWeek = firstDayOfMonth.getDay(); 

    monthYearSpan.textContent = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    calendarGrid.innerHTML = '';

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayNames.forEach(day => {
        const dayNameCell = document.createElement('div');
        dayNameCell.className = 'day-name';
        dayNameCell.textContent = day;
        calendarGrid.appendChild(dayNameCell);
    });

    for (let i = 0; i < startDayOfWeek; i++) {
        calendarGrid.appendChild(document.createElement('div'));
    }

    const today = new Date();
    // FIX 1: Get today's normalized date string for reliable comparison
    const todayString = normalizeDateString(today);

    // CRITICAL FIX 2: Build a map of all completed dates (using YYYY-MM-DD string)
    const completionMap = {}; 
    allHabits.forEach(habit => {
        if (habit.completionHistory) {
            habit.completionHistory.forEach(dateStr => {
                // Convert server UTC date back to user's YYYY-MM-DD local string
                const d = new Date(dateStr);
                const normalized = normalizeDateString(d);
                completionMap[normalized] = true;
            });
        }
    });

    // allHabits.forEach(habit => {
    //     if (habit.completionHistory && habit.completionHistory.length > 0) {
    //         habit.completionHistory.forEach(completionDateString => {
    //             const completedDate = new Date(completionDateString);
                
    //             // We must rely on the Date object's local time components for rendering the day number
    //             if (completedDate.getMonth() === currentMonth && completedDate.getFullYear() === currentYear) {
    //                 const dayKey = completedDate.getDate();
    //                 completionMap[dayKey] = true; 
    //             }
    //         });
    //     }
    // });


    for (let day = 1; day <= daysInMonth; day++) {
        const dayCell = document.createElement('div');
        dayCell.className = 'day-cell';
        dayCell.textContent = day;

        // Create a date object for the cell being checked
        const dateToCheck = new Date(currentYear, currentMonth, day);
        const dateToCheckString = normalizeDateString(dateToCheck);
        
        // const isPast = dateToCheckString < todayString;
        // const isFuture = dateToCheckString > todayString;
        // const isToday = dateToCheckString === todayString;

        // if (isToday) {
        //     dayCell.classList.add('today');
        // }

        // if (isFuture) {
        //     dayCell.classList.add('future');
        // } else if (completionMap[day]) {
        //     // Check against the completionMap for the given day number
        //     dayCell.classList.add('completed');
        // } else if (isPast) {
        //     // If it's a past date and the key is NOT in the completion map, it was missed.
        //     dayCell.classList.add('missed');
        // } 

        if (dateToCheckString === todayString) dayCell.classList.add('today');

        if (dateToCheckString > todayString) {
            dayCell.classList.add('future');
        } else if (completionMap[dateToCheckString]) {
            dayCell.classList.add('completed');
        } else if (dateToCheckString < todayString) {
            dayCell.classList.add('missed');
        } 
        calendarGrid.appendChild(dayCell);
    }
}


// --- AUTH & HABIT ACTION FUNCTIONS (CRUD) ---

async function register(event) {
    if (event && event.preventDefault) event.preventDefault(); 
    
    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');

    if (!nameInput || !emailInput || !passwordInput) {
        alert("Cannot find input fields for registration. Check register.html IDs.");
        return;
    }
    
    const name = nameInput.value;
    const email = emailInput.value;
    const password = passwordInput.value;

    try {
        const response = await fetch(`${API_BASE_URL}/users/register`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        const data = await response.json();
        if (response.ok) {
            alert('Registration Successful! Logging you in...');
            saveToken(data.token); 
            redirectToDashboard(); 
        } else {
            alert(`Registration Failed: ${data.message || 'Server Error'}`);
        }
    } catch (error) {
        console.error('Registration Error:', error);
        alert('An unexpected error occurred during registration.');
    }
}

async function login(event) {
    if (event && event.preventDefault) event.preventDefault(); 
    
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');

    if (!emailInput || !passwordInput) {
        alert("Cannot find input fields for login. Check login.html IDs.");
        return;
    }

    const email = emailInput.value;
    const password = passwordInput.value;

    try {
        const response = await fetch(`${API_BASE_URL}/users/login`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (response.ok) {
            alert('Login Successful!');
            saveToken(data.token); 
            redirectToDashboard(); 
        } else {
            alert(`Login Failed: ${data.message || 'Invalid credentials'}`);
        }
    } catch (error) {
        console.error('Login Error:', error);
        alert('An unexpected error occurred during login.');
    }
}

async function markHabitComplete(habitId) {
    const token = getToken();
    if (!token) return redirectToLogin();
    
    if (!confirm("Mark this habit as complete for today?")) return;
    const localToday = normalizeDateString(new Date());

    try {
        const response = await fetch(`${API_BASE_URL}/habits/${habitId}/complete`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ localDate: localToday })
        });
        const data = await response.json();

        if (response.ok) {
            if (data.message && data.message.includes('already completed')) {
                 alert(data.message); 
            } else {
                 alert('Habit marked complete! Streak updated!');
            }
            fetchHabits(); 
        } else {
            console.error('Mark Complete Failed:', data.message);
            alert(`Failed to update habit: ${data.message || 'Server Error'}`);
        }
    } catch (error) {
        console.error("Network error during mark complete:", error);
        alert('Could not connect to the server.');
    }
}

async function deleteHabit(habitId) {
    const token = getToken();
    if (!token) return redirectToLogin();
    
    if (!confirm("Are you sure you want to delete this habit permanently?")) return;

    try {
        const response = await fetch(`${API_BASE_URL}/habits/${habitId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (response.ok) {
            alert('Habit deleted successfully!');
            fetchHabits(); 
        } else {
            console.error('Delete Failed:', data.message);
            alert(`Failed to delete habit: ${data.message || 'Server Error'}`);
        }
    } catch (error) {
        console.error("Network error during deletion:", error);
        alert('Could not connect to the server.');
    }
}

async function addHabit() {
    const token = getToken();
    if (!token) return redirectToLogin();
    
    const titleInput = document.getElementById('title');
    const descriptionInput = document.getElementById('description');
    
    const title = titleInput.value.trim();
    const description = descriptionInput.value.trim();

    if (!title) {
        alert('Habit title is required!');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/habits`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, description })
        });

        const data = await response.json();

        if (response.ok) {
            alert(`Habit '${title}' created successfully!`);
            titleInput.value = '';
            descriptionInput.value = '';
            fetchHabits(); 
        } else {
            console.error('Add Habit Failed:', data.message);
            alert(`Failed to create habit: ${data.message || 'Server Error'}`);
        }

    } catch (error) {
        console.error("Network error during add habit:", error);
        alert('Could not connect to the server.');
    }
}

let habitBeingEdited = null;

function openEditModal(habitId, currentTitle, currentDescription) {
    habitBeingEdited = habitId;
    document.getElementById('editTitle').value = currentTitle;
    document.getElementById('editDescription').value = currentDescription || '';
    document.getElementById('editModal').style.display = 'block';
}

function closeEditModal() {
    habitBeingEdited = null;
    document.getElementById('editModal').style.display = 'none';
}

async function saveHabitEdit() {
    const token = getToken();
    if (!token) return redirectToLogin();

    const title = document.getElementById('editTitle').value.trim();
    const description = document.getElementById('editDescription').value.trim();

    if (!title) {
        alert('Habit title is required!');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/habits/${habitBeingEdited}`, {
            method: 'PUT',
            headers: { 
                'Authorization': `Bearer ${token}`, 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({ title, description })
        });

        const data = await response.json();

        if (response.ok) {
            alert('Habit updated successfully!');
            closeEditModal();
            fetchHabits();
        } else {
            alert(`Failed to update habit: ${data.message || 'Server Error'}`);
        }
    } catch (error) {
        console.error("Network error during update:", error);
        alert('Could not connect to the server.');
    }
}


// --- RUN ON PAGE LOAD ---
document.addEventListener('DOMContentLoaded', () => {
    // Only run this check if we are on the dashboard page
    if (document.getElementById('calendar')) { 
        checkAuthAndLoad();
    }
});