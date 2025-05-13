const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');

// Get dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    // Get today's date (start of day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get total students
    const totalStudents = await Student.countDocuments();

    // Get today's attendance
    const todayAttendance = await Attendance.find({
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
      },
    });

    const presentToday = todayAttendance.length;
    const absentToday = totalStudents - presentToday;
    const attendanceRate = totalStudents > 0 ? ((presentToday / totalStudents) * 100).toFixed(2) : 0;

    // Get weekly attendance data
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - 6); // Last 7 days

    const weeklyAttendance = await Attendance.aggregate([
      {
        $match: {
          date: { $gte: weekStart, $lte: today },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          present: { $sum: 1 },
        },
      },
      {
        $sort: { '_id': 1 },
      },
    ]);

    const weeklyData = [];
    let currentDate = new Date(weekStart);

    while (currentDate <= today) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const attendance = weeklyAttendance.find(a => a._id === dateStr);
      
      weeklyData.push({
        day: currentDate.toLocaleDateString('en-US', { weekday: 'short' }),
        present: attendance ? attendance.present : 0,
        absent: totalStudents - (attendance ? attendance.present : 0),
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Get recent activity
    const recentActivity = await Attendance.find()
      .populate('student')
      .sort({ createdAt: -1 })
      .limit(10)
      .then(activities => activities.map(activity => ({
        description: `${activity.student.name} marked attendance`,
        timestamp: activity.timeIn,
      })));

    res.json({
      stats: {
        totalStudents,
        presentToday,
        absentToday,
        attendanceRate,
      },
      weeklyData,
      recentActivity,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 