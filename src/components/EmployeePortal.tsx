import api from '../utils/axios';

// Update API calls
const fetchEmployeeProfile = async () => {
  try {
    const userId = localStorage.getItem('userId');
    const response = await api.get(`/employees/${userId}`);
    setData(prevData => ({
      ...prevData,
      profile: response.data
    }));
  } catch (error) {
    console.error('Error fetching employee profile:', error);
  }
}; 