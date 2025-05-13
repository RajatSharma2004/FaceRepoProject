require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const { compare_face, loadModels } = require('./utils/faceapi');
const User = require('./models/User');

// Import routes
const studentRoutes = require('./routes/students');
const attendanceRoutes = require('./routes/attendance');
const courseRoutes = require('./routes/courses');
const dashboardRoutes = require('./routes/dashboard');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/face-attendance', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch((err) => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/students', studentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Serve static files from the React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../Frontend/myapp/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../Frontend/myapp/build/index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

app.post('/login', async(req, res) => {
    try{
    const { fD, id, password } = req.body;
    // console.log(fD);
    if (id && password) {
        const user = await User.findByCredentials(id, password);
        console.log(user)
        return res
            .status(200)
            .json({
                user: {
                    name: user.name,
                    email: user.email,
                    rollNo: user.rollNo,
                    img: process.env.HOST + user.img.split('public')[1],
                },
                id: user._id,
            });
    }
    if (!fD || fD.length === 0) {
        return res.status(400).json({ message: 'Please provide face data' });
    }
    try {
        const {data,id} = await compare_face(fD);
        const today = new Date();
        const date = today.toLocaleDateString();
        await User.findByIdAndUpdate(id, {
            $push: {
              attendance: {
                date: date,
                status: 'Present'
              }
            }
          }, {
            new: true,
            runValidators: true
          });
        
        if (data) {
            return res.status(200).json({ user: data });
        }
        return res.status(400).json({ message: 'User not found' });
    } catch (error) {
        // console.log('error')
        return res.status(400).json({ message: error.message });
    }
} catch(err){
    console.log(err)
    return res.status(400).json({ message: 'User not found' });
}
});

app.get('/users', async (req, res) => {
    try {
        const img = await compare_face();
        res.status(200).send("<img src='" + img.src + "' />");
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

app.post('/register', async (req, res) => {
    const { name, email, rollNo, img, faceData, password } = req.body;
    const user = new User({ name, email, rollNo, faceData, password });
    const imgPath = `public/images/${user._id}.jpg`;
    user.img = imgPath;

    const base64Data = img.split(';base64,').pop();
    await user.save().then((user) => {
        fs.writeFileSync(imgPath, base64Data, 'base64');
        res.status(200).json({ user });
    }).catch((error) => {
        res.status(400).json({ message: error.message });
    });
});