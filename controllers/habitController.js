const Habit = require('../models/habitModel');

// Helper to check if two dates are the same UTC day (CRITICAL FIX)
const isSameDay = (d1, d2) => {
    if (!d1 || !d2 || isNaN(d1.getTime()) || isNaN(d2.getTime())) return false;
    
    // Compare UTC Year, Month, and Date
    return d1.getUTCFullYear() === d2.getUTCFullYear() &&
           d1.getUTCMonth() === d2.getUTCMonth() &&
           d1.getUTCDate() === d2.getUTCDate();
};

// Helper to find the last completed date from the history
const getLastCompletedDate = (history) => {
    if (!history || history.length === 0) return null;
    
    // Convert date strings to Date objects
    const parsedHistory = history.map(date => new Date(date));
    const validHistory = parsedHistory.filter(date => !isNaN(date.getTime()));

    if (validHistory.length === 0) return null;
    
    // Sort descending and return the latest valid date
    const sortedHistory = [...validHistory].sort((a, b) => b.getTime() - a.getTime());
    return sortedHistory[0];
};


const createHabit = async (req, res) => {
    try {
        const habit = await Habit.create({
            title: req.body.title,
            description: req.body.description,
            user: req.user.id,
            streak: 0,
            completionHistory: [],
        });
        res.status(201).json(habit);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const getHabits = async (req, res) => {
    try {
        console.log("GET /api/habits triggered for user:", req.user.id);
        const habits = await Habit.find({ user: req.user.id }, 
            'title description streak completionHistory user');
        res.status(200).json(habits);
    } catch (error) {
        console.error(" Error fetching habits:", error);
        res.status(500).json({ message: error.message });
    }
};

const markHabitComplete = async (req, res) => {
    try {
        const habit = await Habit.findById(req.params.id);
        
        if (!habit || habit.user.toString() !== req.user.id) {
            return res.status(404).json({ message: 'Habit not found or not authorized' });
        }

        // const now = new Date();
        // const lastCompletedDate = getLastCompletedDate(habit.completionHistory);
        
        // 1. Get the date from the frontend, or fallback to server time
        // localDate arrives as "YYYY-MM-DD"
        const localDateStr = req.body.localDate; 
        const now = localDateStr ? new Date(localDateStr) : new Date();

        // 2. Check if this specific day is already in the history
        const alreadyDone = habit.completionHistory.some(date => {
            const d = new Date(date);
            // Simple string comparison for "YYYY-MM-DD"
            return d.toISOString().split('T')[0] === now.toISOString().split('T')[0];
        });

        if (alreadyDone) {
            return res.status(200).json({ ...habit.toObject(), message: 'Habit already completed today.' });
        }


        // --- STREAK CHECK LOGIC ---

        // Check if already completed today using the robust isSameDay helper
        // if (lastCompletedDate && isSameDay(now, lastCompletedDate)) {
        //     return res.status(200).json({ ...habit.toObject(), message: 'Habit already completed today.' });
        // }

        let newStreak = habit.streak;
        const lastDate = getLastCompletedDate(habit.completionHistory);

        if (lastDate) {
            const yesterday = new Date(now);
            yesterday.setDate(now.getDate() - 1);
            
            const lastDateStr = lastDate.toISOString().split('T')[0];
            const yesterdayStr = yesterday.toISOString().split('T')[0];

            if (lastDateStr === yesterdayStr) {
                newStreak += 1;
            } else if (lastDateStr !== now.toISOString().split('T')[0]) {
                newStreak = 1; // Streak broken
            }
        } else {
            newStreak = 1;
        }


        
        // if (lastCompletedDate) {
        //     const yesterday = new Date(now);
        //     // Use UTC methods for consistent day manipulation
        //     yesterday.setUTCDate(now.getUTCDate() - 1); 

        //     if (isSameDay(yesterday, lastCompletedDate)) {
                
        //         newStreak += 1;
        //     } else {
        //         // Streak broken, reset to 1
        //         newStreak = 1;
        //     }
        // } else {
        //     // First time completing
        //     newStreak = 1;
        // }

        // --- UPDATE DATABASE ---
        habit.completionHistory.push(now);
        habit.streak = newStreak;
        
        await habit.save();

        res.status(200).json(habit);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const deleteHabit = async (req, res) => {
    try {
        const habit = await Habit.findById(req.params.id);

        if (!habit) {
            return res.status(404).json({ message: 'Habit not found' });
        }

        if (habit.user.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        await habit.deleteOne();
        res.status(200).json({ message: 'Habit deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateHabit = async (req, res) => {
    try {
        const habit = await Habit.findById(req.params.id);

        if (!habit) {
            return res.status(404).json({ message: 'Habit not found' });
        }

        if (habit.user.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        // Update fields
        habit.title = req.body.title || habit.title;
        habit.description = req.body.description || habit.description;

        const updatedHabit = await habit.save();
        res.status(200).json(updatedHabit);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};



module.exports = { createHabit, getHabits, markHabitComplete, deleteHabit, updateHabit };