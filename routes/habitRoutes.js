
const express = require('express');
const router = express.Router();

const { createHabit, getHabits, markHabitComplete, deleteHabit, updateHabit } = require('../controllers/habitController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, createHabit);
router.get('/', protect, getHabits);
router.put('/:id/complete', protect, markHabitComplete);
router.put('/:id', protect, updateHabit);
router.delete('/:id', protect, deleteHabit);


module.exports = router;
