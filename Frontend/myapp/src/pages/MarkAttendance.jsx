import React, { useState, useEffect, useRef } from 'react';
import { 
  Container, 
  Paper, 
  Button, 
  Typography, 
  Box, 
  CircularProgress,
  Alert,
  Snackbar,
  Grid,
  Card,
  CardContent,
  Avatar,
  Divider,
  IconButton,
} from '@mui/material';
import {
  PhotoCamera,
  Replay,
  Check,
  Cancel,
} from '@mui/icons-material';
import * as faceapi from 'face-api.js';
import axios from 'axios';

const MarkAttendance = () => {
  const videoRef = useRef();
  const canvasRef = useRef();
  const photoRef = useRef();
  const [isLoading, setIsLoading] = useState(true);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [recognizedPerson, setRecognizedPerson] = useState(null);
  const [error, setError] = useState(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    const loadModels = async () => {
      try {
        setIsLoading(true);
        const MODEL_URL = `${process.env.PUBLIC_URL}/models`;
        
        await Promise.all([
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL)
        ]);
        
        setModelsLoaded(true);
        console.log('Face recognition models loaded successfully');
        await startVideo();
      } catch (error) {
        console.error('Error loading models:', error);
        setError('Failed to load face recognition models. Please refresh the page.');
      } finally {
        setIsLoading(false);
      }
    };

    loadModels();
    
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);

  const startVideo = async () => {
    try {
      const constraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        }
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await new Promise((resolve) => {
          videoRef.current.onloadedmetadata = () => {
            resolve();
          };
        });
        console.log('Camera started successfully');
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setError(
        error.name === 'NotAllowedError' 
          ? 'Camera access denied. Please allow camera access and refresh the page.'
          : 'Error accessing camera. Please make sure your camera is connected and refresh the page.'
      );
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) {
      console.error('Video or canvas element not found');
      return;
    }

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      // Clear the canvas
      context.clearRect(0, 0, canvas.width, canvas.height);

      // Draw the video frame onto the canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Get the image data URL
      const imageDataURL = canvas.toDataURL('image/jpeg', 0.9);
      setCapturedImage(imageDataURL);
      setShowPreview(true);

      console.log('Photo captured successfully');
    } catch (error) {
      console.error('Error capturing photo:', error);
      setError('Failed to capture photo. Please try again.');
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setShowPreview(false);
    setRecognizedPerson(null);
  };

  const handleRecognition = async () => {
    if (isRecognizing || !modelsLoaded) return;
    setIsRecognizing(true);
    setError(null);
    
    try {
      // First capture the photo
      capturePhoto();

      // Wait a moment for the canvas to update
      await new Promise(resolve => setTimeout(resolve, 100));

      // Use the canvas element for face detection
      const detections = await faceapi.detectAllFaces(canvasRef.current)
        .withFaceLandmarks()
        .withFaceDescriptors();

      if (!detections || detections.length === 0) {
        setError('No face detected. Please make sure your face is clearly visible.');
        setIsRecognizing(false);
        return;
      }

      if (detections.length > 1) {
        setError('Multiple faces detected. Please ensure only one person is in frame.');
        setIsRecognizing(false);
        return;
      }

      console.log('Face detected, preparing recognition request...');

      // Convert descriptor to Array and verify it's valid
      const faceDescriptor = Array.from(detections[0].descriptor);
      if (!faceDescriptor || faceDescriptor.length !== 128) {
        throw new Error('Invalid face descriptor generated');
      }

      console.log('Sending recognition request...');

      // Send face descriptors to backend for recognition
      const response = await axios.post('/api/attendance/recognize', {
        faceDescriptor: faceDescriptor
      });

      console.log('Recognition response:', response.data);

      if (response.data.recognized) {
        // Mark attendance first before showing success UI
        try {
          await axios.post('/api/attendance/mark', {
            studentId: response.data.person._id,
            photoData: capturedImage
          });
          console.log('Attendance marked successfully');
          // Only set recognized person after successful attendance marking
          setRecognizedPerson(response.data.person);
        } catch (markError) {
          console.error('Error marking attendance:', markError);
          setError(markError.response?.data?.message || 'Attendance marking failed. Please try again.');
          setRecognizedPerson(null); // Clear any previous recognition
          setIsRecognizing(false);
          return;
        }
      } else {
        setError(response.data.message || 'Face not recognized. Please make sure you are registered in the system.');
        setRecognizedPerson(null); // Ensure no stale recognition data
      }
    } catch (error) {
      console.error('Error during recognition:', error);
      if (error.response) {
        const errorMessage = error.response.data.message || 'Recognition failed';
        const errorCode = error.response.data.error;
        
        switch (errorCode) {
          case 'INVALID_DESCRIPTOR_FORMAT':
          case 'INVALID_DESCRIPTOR_LENGTH':
            setError('Face detection failed. Please ensure your face is clearly visible and try again.');
            break;
          case 'NO_STUDENTS':
            setError('No students are registered in the system. Please contact your administrator.');
            break;
          case 'NO_MATCH':
            setError('Face not recognized. Please ensure you are registered in the system.');
            break;
          default:
            setError(errorMessage);
        }
      } else {
        setError('Network error. Please check your connection and try again.');
      }
    } finally {
      setIsRecognizing(false);
    }
  };

  const drawFaceDetections = async () => {
    if (!videoRef.current || !canvasRef.current || !modelsLoaded || showPreview) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Ensure video is playing and has dimensions
    if (video.readyState !== video.HAVE_ENOUGH_DATA) return;

    const displaySize = {
      width: video.videoWidth || 640,
      height: video.videoHeight || 480
    };

    if (displaySize.width === 0 || displaySize.height === 0) return;

    // Match canvas dimensions to video
    canvas.width = displaySize.width;
    canvas.height = displaySize.height;
    faceapi.matchDimensions(canvas, displaySize);

    try {
      const detections = await faceapi.detectAllFaces(video)
        .withFaceLandmarks();

      const resizedDetections = faceapi.resizeResults(detections, displaySize);
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      faceapi.draw.drawDetections(canvas, resizedDetections);
      faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
    } catch (error) {
      console.error('Error drawing face detections:', error);
    }
  };

  useEffect(() => {
    let animationFrame;
    const animate = () => {
      drawFaceDetections();
      animationFrame = requestAnimationFrame(animate);
    };
    
    if (modelsLoaded && !showPreview) {
      animate();
    }
    
    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [modelsLoaded, showPreview]);

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom align="center">
              Mark Attendance
            </Typography>

            <Box sx={{
              position: 'relative',
              width: '100%',
              height: '480px',
              backgroundColor: '#000',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              overflow: 'hidden'
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
                  objectFit: 'contain',
                  transform: 'scaleX(-1)'
                }}
              />
              <canvas
                ref={canvasRef}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  transform: 'scaleX(-1)'
                }}
                width="640"
                height="480"
              />
            </Box>

            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 2 }}>
              {!showPreview ? (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleRecognition}
                  disabled={isLoading || isRecognizing || !modelsLoaded}
                  startIcon={<PhotoCamera />}
                  size="large"
                >
                  {isRecognizing ? 'Recognizing...' : 'Capture & Recognize'}
                </Button>
              ) : (
                <>
                  <Button
                    variant="outlined"
                    color="primary"
                    onClick={retakePhoto}
                    startIcon={<Replay />}
                  >
                    Retake Photo
                  </Button>
                  <Button
                    variant="contained"
                    color="success"
                    onClick={handleRecognition}
                    disabled={isRecognizing}
                    startIcon={<Check />}
                  >
                    Confirm & Save
                  </Button>
                </>
              )}
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper elevation={3} sx={{ p: 3, height: '100%' }}>
            <Typography variant="h5" gutterBottom align="center">
              Recognition Results
            </Typography>
            
            {recognizedPerson ? (
              <Card sx={{ mt: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar
                      sx={{ width: 64, height: 64, mr: 2 }}
                      src={recognizedPerson.photoUrl}
                    />
                    <Box>
                      <Typography variant="h6">{recognizedPerson.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        ID: {recognizedPerson.studentId}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Typography variant="body2" color="text.secondary">
                    Course: {recognizedPerson.course}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Time: {new Date().toLocaleTimeString()}
                  </Typography>
                  {recognizedPerson && (
                    <Typography variant="body2" color="success.main" sx={{ mt: 1 }}>
                      ✓ Attendance Marked Successfully
                    </Typography>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Box sx={{ 
                height: '200px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                border: '1px dashed grey',
                borderRadius: 1,
                mt: 2
              }}>
                <Typography color="text.secondary">
                  No recognition results yet
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      <Snackbar 
        open={!!error} 
        autoHideDuration={6000} 
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default MarkAttendance; 