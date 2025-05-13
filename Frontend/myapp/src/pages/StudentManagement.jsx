import React, { useState, useEffect, useRef } from 'react';
import {
  Container,
  Paper,
  Button,
  Typography,
  Box,
  TextField,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Alert,
  Snackbar,
  CircularProgress,
  Avatar,
} from '@mui/material';
import {
  Edit,
  Delete,
  PersonAdd,
  PhotoCamera,
  Replay,
  Check,
} from '@mui/icons-material';
import * as faceapi from 'face-api.js';
import axios from 'axios';

const StudentManagement = () => {
  const [students, setStudents] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    studentId: '',
    email: '',
    course: '',
  });
  const [isCaptureMode, setIsCaptureMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [faceDescriptor, setFaceDescriptor] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [cameraInitializing, setCameraInitializing] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  // Effect to handle video element mounting
  useEffect(() => {
    if (showCamera && videoRef.current) {
      startCamera();
    }
  }, [showCamera]);

  // Effect to cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    fetchStudents();
    loadModels();
  }, []);

  const stopCamera = () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          if (track.readyState === 'live') {
            track.stop();
          }
        });
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setIsCaptureMode(false);
      setShowCamera(false);
    } catch (error) {
      console.error('Error stopping camera:', error);
    }
  };

  const loadModels = async () => {
    try {
      setIsLoading(true);
      const MODEL_URL = '/models';
      
      console.log('Loading face-api.js models...');
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
      ]);
      
      setModelsLoaded(true);
      console.log('Face recognition models loaded successfully');
    } catch (error) {
      console.error('Error loading models:', error);
      setError('Failed to load face recognition models. Please refresh the page.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get('/api/students');
      setStudents(response.data);
    } catch (error) {
      console.error('Error fetching students:', error);
      setError('Failed to fetch students. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = (student = null) => {
    if (student) {
      setFormData(student);
      setSelectedStudent(student);
      if (student.photoUrl) {
        setCapturedImage(student.photoUrl);
      }
    } else {
      setFormData({
        name: '',
        studentId: '',
        email: '',
        course: '',
      });
      setSelectedStudent(null);
      setCapturedImage(null);
    }
    setFaceDescriptor(null);
    setOpenDialog(true);
    setShowCamera(false);
    setIsCaptureMode(false);
  };

  const handleCloseDialog = () => {
    stopCamera();
    setOpenDialog(false);
    setCapturedImage(null);
    setFaceDescriptor(null);
    setError(null);
    setShowCamera(false);
    setIsCaptureMode(false);
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const initializeCamera = async () => {
    try {
      if (!modelsLoaded) {
        throw new Error('Face recognition models are not loaded yet. Please wait.');
      }
      
      // First stop any existing camera
      stopCamera();
      
      // Then show the video element
      setShowCamera(true);
      setCameraInitializing(true);
      setError(null);
    } catch (error) {
      console.error('Error initializing camera:', error);
      setError(error.message);
      setShowCamera(false);
      setCameraInitializing(false);
    }
  };

  const startCamera = async () => {
    if (!videoRef.current) {
      console.error('Video element not found');
      setError('Camera initialization failed. Please try again.');
      setShowCamera(false);
      setCameraInitializing(false);
      return;
    }

    try {
      console.log('Requesting camera access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      });

      console.log('Camera access granted');
      streamRef.current = stream;

      // Set up video element
      const videoElement = videoRef.current;
      if (!videoElement) {
        throw new Error('Video element not available');
      }

      // Set video element properties
      videoElement.srcObject = stream;
      videoElement.muted = true;
      videoElement.playsInline = true;
      videoElement.setAttribute('playsinline', true);

      // Wait for video to start playing
      await new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Video playback timeout'));
        }, 5000);

        const playHandler = () => {
          console.log('Video started playing:', {
            readyState: videoElement.readyState,
            videoWidth: videoElement.videoWidth,
            videoHeight: videoElement.videoHeight
          });
          clearTimeout(timeoutId);
          resolve();
        };

        const errorHandler = (error) => {
          console.error('Video error:', error);
          clearTimeout(timeoutId);
          reject(new Error('Failed to start video playback'));
        };

        videoElement.addEventListener('playing', playHandler, { once: true });
        videoElement.addEventListener('error', errorHandler, { once: true });

        videoElement.play().catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
      });

      setIsCaptureMode(true);
      console.log('Camera started successfully');
    } catch (error) {
      console.error('Camera error:', error);
      setError(`Camera error: ${error.message}`);
      stopCamera();
    } finally {
      setCameraInitializing(false);
    }
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) {
      setError('Camera components not initialized');
      return;
    }

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      // Ensure video is playing and has dimensions
      if (video.readyState !== video.HAVE_ENOUGH_DATA) {
        throw new Error('Video stream is not ready. Please wait.');
      }

      // Set canvas size to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Clear canvas and draw video frame
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(video, 0, 0);

      // Wait for face detection
      console.log('Detecting face...');
      const detection = await faceapi.detectSingleFace(
        video,
        new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 })
      ).withFaceLandmarks().withFaceDescriptor();

      if (!detection) {
        throw new Error('No face detected. Please ensure your face is clearly visible.');
      }

      console.log('Face detected:', detection);

      // Get image data after successful face detection
      const imageData = canvas.toDataURL('image/jpeg', 0.9);

      setCapturedImage(imageData);
      setFaceDescriptor(Array.from(detection.descriptor));
      stopCamera();
    } catch (error) {
      console.error('Capture error:', error);
      setError(error.message);
    }
  };

  const validateForm = () => {
    if (!formData.name || !formData.studentId || !formData.email || !formData.course) {
      setError('Please fill in all required fields.');
      return false;
    }
    if (!faceDescriptor || !capturedImage) {
      setError('Please capture a photo with your face clearly visible.');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    try {
      if (!validateForm()) return;

      setIsLoading(true);
      const data = {
        ...formData,
        faceDescriptor,
        photoData: capturedImage,
      };

      if (selectedStudent) {
        await axios.put(`/api/students/${selectedStudent._id}`, data);
        setSuccess('Student updated successfully!');
      } else {
        await axios.post('/api/students', data);
        setSuccess('New student added successfully!');
      }

      handleCloseDialog();
      fetchStudents();
    } catch (error) {
      console.error('Error saving student:', error);
      setError(error.response?.data?.message || 'Error saving student. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (studentId) => {
    if (window.confirm('Are you sure you want to delete this student?')) {
      try {
        setIsLoading(true);
        await axios.delete(`/api/students/${studentId}`);
        setSuccess('Student deleted successfully!');
        fetchStudents();
      } catch (error) {
        console.error('Error deleting student:', error);
        setError('Error deleting student. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h4">Student Management</Typography>
          <Button
            variant="contained"
            startIcon={<PersonAdd />}
            onClick={() => handleOpenDialog()}
          >
            Add New Student
          </Button>
        </Box>

        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
            <CircularProgress />
          </Box>
        )}

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Photo</TableCell>
                <TableCell>Student ID</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Course</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {students.map((student) => (
                <TableRow key={student._id}>
                  <TableCell>
                    <Avatar
                      src={student.photoUrl}
                      alt={student.name}
                      sx={{ width: 40, height: 40 }}
                    />
                  </TableCell>
                  <TableCell>{student.studentId}</TableCell>
                  <TableCell>{student.name}</TableCell>
                  <TableCell>{student.email}</TableCell>
                  <TableCell>{student.course}</TableCell>
                  <TableCell>
                    <IconButton onClick={() => handleOpenDialog(student)}>
                      <Edit />
                    </IconButton>
                    <IconButton onClick={() => handleDelete(student._id)}>
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
          <DialogTitle>
            {selectedStudent ? 'Edit Student' : 'Add New Student'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  label="Name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  label="Student ID"
                  name="studentId"
                  value={formData.studentId}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  label="Email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  label="Course"
                  name="course"
                  value={formData.course}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ 
                  width: '100%',
                  height: '300px',
                  backgroundColor: '#000',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  position: 'relative',
                  overflow: 'hidden',
                  borderRadius: 1
                }}>
                  {showCamera && (
                    <Box sx={{
                      position: 'relative',
                      width: '100%',
                      height: '300px',
                      backgroundColor: '#000',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      overflow: 'hidden'
                    }}>
                      <Box sx={{
                        position: 'relative',
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center'
                      }}>
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          width="640"
                          height="480"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            transform: 'scaleX(-1)'
                          }}
                        />
                        <canvas
                          ref={canvasRef}
                          style={{ display: 'none' }}
                          width="640"
                          height="480"
                        />
                      </Box>
                      {cameraInitializing && (
                        <Box sx={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          zIndex: 2,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 2,
                          backgroundColor: 'rgba(0, 0, 0, 0.7)',
                          padding: 2,
                          borderRadius: 1
                        }}>
                          <CircularProgress />
                          <Typography color="white">
                            Initializing camera...
                          </Typography>
                        </Box>
                      )}
                      {isCaptureMode && !cameraInitializing && (
                        <Button
                          variant="contained"
                          onClick={capturePhoto}
                          startIcon={<PhotoCamera />}
                          sx={{
                            position: 'absolute',
                            bottom: 16,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            zIndex: 2
                          }}
                        >
                          Capture Photo
                        </Button>
                      )}
                    </Box>
                  )}
                  {!showCamera && capturedImage && (
                    <Box sx={{
                      position: 'relative',
                      width: '100%',
                      height: '300px',
                      backgroundColor: '#000',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      overflow: 'hidden'
                    }}>
                      <img
                        src={capturedImage}
                        alt="Captured"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                          transform: 'scaleX(-1)'
                        }}
                      />
                      <Button
                        variant="contained"
                        onClick={initializeCamera}
                        startIcon={<Replay />}
                        sx={{
                          position: 'absolute',
                          bottom: 16,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          zIndex: 2
                        }}
                      >
                        Retake Photo
                      </Button>
                    </Box>
                  )}
                  {!showCamera && !capturedImage && (
                    <Box sx={{
                      width: '100%',
                      height: '300px',
                      backgroundColor: '#f5f5f5',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      borderRadius: 1
                    }}>
                      <Button
                        variant="contained"
                        onClick={initializeCamera}
                        startIcon={<PhotoCamera />}
                        disabled={!modelsLoaded}
                      >
                        {!modelsLoaded ? 'Loading Models...' : 'Start Camera'}
                      </Button>
                    </Box>
                  )}
                </Box>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={isLoading || !faceDescriptor || !capturedImage}
              startIcon={isLoading ? <CircularProgress size={20} /> : <Check />}
            >
              {isLoading ? 'Saving...' : 'Save'}
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>

      <Snackbar
        open={!!error || !!success}
        autoHideDuration={6000}
        onClose={() => {
          setError(null);
          setSuccess(null);
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => {
            setError(null);
            setSuccess(null);
          }}
          severity={error ? 'error' : 'success'}
          sx={{ width: '100%' }}
        >
          {error || success}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default StudentManagement; 