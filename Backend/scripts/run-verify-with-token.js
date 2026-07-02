// Helper to run verification script with provided token in Node on Windows
const path = require('path');
process.env.API_AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZkZGUyNjYzLTlkYmEtNDVlZC1iYzljLTk2NGVkMjVjZmJlZiIsInJvbGUiOiJzZWNyZXRhcnkiLCJuYW1lIjoidGVzdGVyMDAzIiwiZW1haWwiOiJ0ZXN0ZXIwMDNAZ21haWwuY29tIiwiaWF0IjoxNzc4MDg1Njg5LCJleHAiOjE3NzgwODkyODl9.0mryzA7QNT0EY-t4Wga7sEY5usb1yOgiU2AOt0hK8MI';
require('./verify-secretary-workflow.js');
