import axios from "axios";

const API_URL = "http://localhost:5000"; // Backend URL

// Birds
export const getBirds = async () => {
  const response = await axios.get(`${API_URL}/birds`);
  return response.data;
};

export const addBird = async (bird) => {
  const response = await axios.post(`${API_URL}/birds`, bird);
  return response.data;
};

// Feeds
export const getFeeds = async () => {
  const response = await axios.get(`${API_URL}/feeds`);
  return response.data;
};

// Eggs
export const getEggs = async () => {
  const response = await axios.get(`${API_URL}/eggs`);
  return response.data;
};

// Vaccinations
export const getVaccinations = async () => {
  const response = await axios.get(`${API_URL}/vaccinations`);
  return response.data;
};

// Branches
export const getBranches = async () => {
  const response = await axios.get(`${API_URL}/branches`);
  return response.data;
};
