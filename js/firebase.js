import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js';
import { 
    getFirestore, 
    collection, 
    doc, 
    getDocs, 
    getDoc, 
    setDoc, 
    updateDoc, 
    deleteDoc, 
    query, 
    orderBy, 
    where,
    onSnapshot
} from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js';

const firebaseConfig = {
    apiKey: "AIzaSyBYHTG6eir-gtl5m_AGEx6vavxiWhhf_2I",
    authDomain: "orechiosco.firebaseapp.com",
    projectId: "orechiosco",
    storageBucket: "orechiosco.firebasestorage.app",
    messagingSenderId: "606103127337",
    appId: "1:606103127337:web:968c59504d5eb2fca6e338",
    measurementId: "G-0K1GRHFN03"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

class FirebaseAPI {
    constructor() {
        this.db = db;
    }

    // Employees collection methods
    async getEmployees() {
        try {
            const employeesRef = collection(this.db, 'employees');
            const snapshot = await getDocs(employeesRef);
            const employees = {};
            snapshot.forEach(doc => {
                employees[doc.id] = doc.data();
            });
            return employees;
        } catch (error) {
            console.error('Error getting employees:', error);
            throw error;
        }
    }

    async getEmployee(username) {
        try {
            const employeeRef = doc(this.db, 'employees', username);
            const snapshot = await getDoc(employeeRef);
            return snapshot.exists() ? snapshot.data() : null;
        } catch (error) {
            console.error('Error getting employee:', error);
            throw error;
        }
    }

    async createEmployee(username, data) {
        try {
            const employeeRef = doc(this.db, 'employees', username);
            await setDoc(employeeRef, data);
            return true;
        } catch (error) {
            console.error('Error creating employee:', error);
            throw error;
        }
    }

    async updateEmployee(username, data) {
        try {
            const employeeRef = doc(this.db, 'employees', username);
            await updateDoc(employeeRef, data);
            return true;
        } catch (error) {
            console.error('Error updating employee:', error);
            throw error;
        }
    }

    async deleteEmployee(username) {
        try {
            const employeeRef = doc(this.db, 'employees', username);
            await deleteDoc(employeeRef);
            return true;
        } catch (error) {
            console.error('Error deleting employee:', error);
            throw error;
        }
    }

    // Hours collection methods
    async getEmployeeHours(username) {
        try {
            const hoursRef = doc(this.db, 'hours', username);
            const snapshot = await getDoc(hoursRef);
            return snapshot.exists() ? snapshot.data() : {};
        } catch (error) {
            console.error('Error getting employee hours:', error);
            throw error;
        }
    }

    async saveEmployeeHours(username, date, hoursData) {
        try {
            const hoursRef = doc(this.db, 'hours', username);
            const updateData = { [date]: hoursData };
            
            // Check if document exists
            const snapshot = await getDoc(hoursRef);
            if (snapshot.exists()) {
                await updateDoc(hoursRef, updateData);
            } else {
                await setDoc(hoursRef, updateData);
            }
            return true;
        } catch (error) {
            console.error('Error saving employee hours:', error);
            throw error;
        }
    }

    async getAllHours() {
        try {
            const hoursRef = collection(this.db, 'hours');
            const snapshot = await getDocs(hoursRef);
            const allHours = {};
            snapshot.forEach(doc => {
                allHours[doc.id] = doc.data();
            });
            return allHours;
        } catch (error) {
            console.error('Error getting all hours:', error);
            throw error;
        }
    }

    // Shifts collection methods
    async getShifts(date) {
        try {
            const shiftsRef = doc(this.db, 'shifts', date);
            const snapshot = await getDoc(shiftsRef);
            return snapshot.exists() ? snapshot.data() : {};
        } catch (error) {
            console.error('Error getting shifts:', error);
            throw error;
        }
    }

    async saveShifts(date, shiftsData) {
        try {
            const shiftsRef = doc(this.db, 'shifts', date);
            await setDoc(shiftsRef, shiftsData);
            return true;
        } catch (error) {
            console.error('Error saving shifts:', error);
            throw error;
        }
    }

    async getWeekShifts(startDate, endDate) {
        try {
            const shiftsRef = collection(this.db, 'shifts');
            const snapshot = await getDocs(shiftsRef);
            const weekShifts = {};
            
            snapshot.forEach(doc => {
                const date = doc.id;
                if (date >= startDate && date <= endDate) {
                    weekShifts[date] = doc.data();
                }
            });
            
            return weekShifts;
        } catch (error) {
            console.error('Error getting week shifts:', error);
            throw error;
        }
    }

    // Authentication helper
    async validateCredentials(username, password) {
        try {
            // Check admin credentials
            if (username === 'admin' && password === 'admin1234') {
                return { username: 'admin', role: 'admin' };
            }

            // Check employee credentials
            const employee = await this.getEmployee(username);
            if (employee && employee.password === password) {
                return { username, role: employee.role };
            }

            return null;
        } catch (error) {
            console.error('Error validating credentials:', error);
            throw error;
        }
    }
}

export default new FirebaseAPI();