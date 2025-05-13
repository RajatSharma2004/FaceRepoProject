const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const { compareFaceDescriptors } = require('../utils/faceRecognition');

// Mark attendance
router.post('/mark', async (req, res) => {
  try {
    const { studentId } = req.body;

    // Validate student ID
    if (!studentId) {
      return res.status(400).json({ 
        message: 'Student ID is required',
        error: 'MISSING_STUDENT_ID'
      });
    }

    // Check if student exists
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ 
        message: 'Student not found',
        error: 'STUDENT_NOT_FOUND'
      });
    }

    // Check for duplicate attendance
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingAttendance = await Attendance.findOne({
      student: studentId,
      date: {
        $gte: today,
        $lt: tomorrow
      }
    });

    if (existingAttendance) {
      return res.status(400).json({ 
        message: 'Attendance already marked for today',
        error: 'DUPLICATE_ATTENDANCE',
        attendance: existingAttendance
      });
    }

    // Create new attendance record
    const attendance = new Attendance({
      student: studentId,
      date: today,
      timeIn: new Date(),
      status: 'Present',
    });

    const newAttendance = await attendance.save();
    const populatedAttendance = await newAttendance.populate('student');
    
    return res.status(201).json({
      message: 'Attendance marked successfully',
      attendance: populatedAttendance
    });
  } catch (error) {
    console.error('Error marking attendance:', error);
    return res.status(500).json({ 
      message: 'Failed to mark attendance',
      error: error.message
    });
  }
});

// Recognize face
router.post('/recognize', async (req, res) => {
  try {
    const { faceDescriptor } = req.body;
    
    // Validate face descriptor
    if (!faceDescriptor || !Array.isArray(faceDescriptor)) {
      return res.status(400).json({ 
        message: 'Invalid face descriptor format. Expected an array of numbers.',
        error: 'INVALID_DESCRIPTOR_FORMAT'
      });
    }

    if (faceDescriptor.length !== 128) {
      return res.status(400).json({ 
        message: 'Invalid face descriptor length. Expected 128 values.',
        error: 'INVALID_DESCRIPTOR_LENGTH'
      });
    }

    const students = await Student.find();
    
    if (!students || students.length === 0) {
      return res.status(404).json({
        message: 'No students found in the database.',
        error: 'NO_STUDENTS'
      });
    }
    
    let bestMatch = null;
    let bestDistance = Infinity;

    for (const student of students) {
      try {
        if (!student.faceDescriptor || !Array.isArray(student.faceDescriptor)) {
          console.warn(`Invalid face descriptor for student ${student._id}`);
          continue;
        }

        const distance = compareFaceDescriptors(faceDescriptor, student.faceDescriptor);
        if (distance < bestDistance && distance < 0.6) { // Threshold for face recognition
          bestDistance = distance;
          bestMatch = student;
        }
      } catch (error) {
        console.error(`Error comparing face descriptors for student ${student._id}:`, error);
        continue;
      }
    }

    if (bestMatch) {
      return res.json({
        recognized: true,
        person: bestMatch,
        confidence: 1 - bestDistance // Convert distance to confidence score
      });
    } else {
      return res.json({
        recognized: false,
        message: 'No matching student found',
        error: 'NO_MATCH'
      });
    }
  } catch (error) {
    console.error('Face recognition error:', error);
    return res.status(500).json({ 
      message: 'Internal server error during face recognition',
      error: error.message
    });
  }
});

// Get attendance report
router.get('/report', async (req, res) => {
  try {
    const { startDate, endDate, course } = req.query;
    const query = {
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    };

    if (course && course !== 'all') {
      const students = await Student.find({ course });
      query.student = { $in: students.map(s => s._id) };
    }

    const attendanceRecords = await Attendance.find(query)
      .populate('student')
      .sort({ date: -1, timeIn: -1 });

    const totalStudents = await Student.countDocuments(course ? { course } : {});
    const totalDays = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1;
    const averageAttendance = (attendanceRecords.length / (totalStudents * totalDays) * 100).toFixed(2);

    res.json({
      attendanceRecords,
      summary: {
        totalStudents,
        averageAttendance,
        totalDays,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Export attendance data as CSV
router.get('/export', async (req, res) => {
  try {
    const { startDate, endDate, course } = req.query;
    const query = {
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    };

    if (course && course !== 'all') {
      const students = await Student.find({ course });
      query.student = { $in: students.map(s => s._id) };
    }

    const attendanceRecords = await Attendance.find(query)
      .populate('student')
      .sort({ date: -1, timeIn: -1 });

    const csv = [
      'Date,Student ID,Name,Course,Time In,Status',
      ...attendanceRecords.map(record => {
        return `${record.date.toLocaleDateString()},${record.student.studentId},${record.student.name},${record.student.course},${record.timeIn.toLocaleTimeString()},${record.status}`;
      }),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=attendance_report.csv');
    res.send(csv);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 