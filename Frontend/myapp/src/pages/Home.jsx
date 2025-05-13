import React from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Paper,
  useTheme,
} from '@mui/material';
import {
  Face as FaceIcon,
  School as SchoolIcon,
  Assessment as AssessmentIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const theme = useTheme();
  const navigate = useNavigate();

  const features = [
    {
      icon: <FaceIcon sx={{ fontSize: 40 }} />,
      title: 'Face Recognition',
      description: 'Advanced facial recognition for accurate attendance tracking',
    },
    {
      icon: <SchoolIcon sx={{ fontSize: 40 }} />,
      title: 'Student Management',
      description: 'Easy-to-use interface for managing student records',
    },
    {
      icon: <AssessmentIcon sx={{ fontSize: 40 }} />,
      title: 'Attendance Reports',
      description: 'Detailed reports and analytics for attendance data',
    },
    {
      icon: <SecurityIcon sx={{ fontSize: 40 }} />,
      title: 'Secure System',
      description: 'Safe and reliable attendance management',
    },
  ];

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Hero Section */}
      <Paper
        sx={{
          position: 'relative',
          backgroundColor: 'grey.800',
          color: '#fff',
          mb: 4,
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          backgroundImage: 'url(/hero-background.jpg)',
          minHeight: '400px',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            right: 0,
            left: 0,
            backgroundColor: 'rgba(0,0,0,.6)',
          }}
        />
        <Container maxWidth="lg">
          <Grid container>
            <Grid item md={6}>
              <Box
                sx={{
                  position: 'relative',
                  p: { xs: 3, md: 6 },
                  pr: { md: 0 },
                  minHeight: '400px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                }}
              >
                <Typography
                  component="h1"
                  variant="h2"
                  color="inherit"
                  gutterBottom
                >
                  Face Recognition Attendance System
                </Typography>
                <Typography variant="h5" color="inherit" paragraph>
                  Modernize your attendance tracking with our advanced facial
                  recognition technology. Accurate, efficient, and contactless.
                </Typography>
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => navigate('/mark-attendance')}
                  sx={{ mt: 4, width: 'fit-content' }}
                >
                  Mark Attendance
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Paper>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ mt: 8, mb: 8 }}>
        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: theme.shadows[8],
                  },
                }}
              >
                <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
                  <Box sx={{ mb: 2, color: 'primary.main' }}>{feature.icon}</Box>
                  <Typography gutterBottom variant="h5" component="h2">
                    {feature.title}
                  </Typography>
                  <Typography>{feature.description}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Statistics Section */}
        <Paper sx={{ mt: 8, p: 4, backgroundColor: 'primary.main', color: 'white' }}>
          <Grid container spacing={4} justifyContent="center">
            <Grid item xs={12} md={4} textAlign="center">
              <Typography variant="h3">100%</Typography>
              <Typography variant="h6">Accuracy</Typography>
            </Grid>
            <Grid item xs={12} md={4} textAlign="center">
              <Typography variant="h3">Real-time</Typography>
              <Typography variant="h6">Processing</Typography>
            </Grid>
            <Grid item xs={12} md={4} textAlign="center">
              <Typography variant="h3">Secure</Typography>
              <Typography variant="h6">Data Protection</Typography>
            </Grid>
          </Grid>
        </Paper>
      </Container>
    </Box>
  );
};

export default Home;
