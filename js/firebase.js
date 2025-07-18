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
    onSnapshot,
    addDoc
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

    // Libro Nero methods
    async getLibroNeroClients() {
        try {
            const clientsRef = collection(this.db, 'libro_nero_clients');
            const snapshot = await getDocs(clientsRef);
            const clients = [];
            snapshot.forEach(doc => {
                clients.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            return clients;
        } catch (error) {
            console.error('Error getting libro nero clients:', error);
            throw error;
        }
    }

    async getLibroNeroClient(clientId) {
        try {
            const clientRef = doc(this.db, 'libro_nero_clients', clientId);
            const snapshot = await getDoc(clientRef);
            return snapshot.exists() ? { id: clientId, ...snapshot.data() } : null;
        } catch (error) {
            console.error('Error getting libro nero client:', error);
            throw error;
        }
    }
    async createLibroNeroClient(clientData) {
        try {
            const clientsRef = collection(this.db, 'libro_nero_clients');
            const docRef = await addDoc(clientsRef, clientData);
            return docRef.id;
        } catch (error) {
            console.error('Error creating libro nero client:', error);
            throw error;
        }
    }

    async deleteLibroNeroClient(clientId) {
        try {
            const clientRef = doc(this.db, 'libro_nero_clients', clientId);
            await deleteDoc(clientRef);
            return true;
        } catch (error) {
            console.error('Error deleting libro nero client:', error);
            throw error;
        }
    }

    async deleteLibroNeroClientWithTransactions(clientId) {
        try {
            // First delete all transactions
            const transactions = await this.getClientTransactions(clientId);
            const deletePromises = transactions.map(transaction => 
                this.deleteClientTransaction(clientId, transaction.id)
            );
            await Promise.all(deletePromises);
            
            // Then delete the client
            await this.deleteLibroNeroClient(clientId);
            return true;
        } catch (error) {
            console.error('Error deleting libro nero client with transactions:', error);
            throw error;
        }
    }
    async getClientTransactions(clientId) {
        try {
            const transactionsRef = collection(this.db, 'libro_nero_clients', clientId, 'transactions');
            const q = query(transactionsRef, orderBy('timestamp', 'desc'));
            const snapshot = await getDocs(q);
            const transactions = [];
            snapshot.forEach(doc => {
                transactions.push({ id: doc.id, ...doc.data() });
            });
            return transactions;
        } catch (error) {
            console.error('Error getting client transactions:', error);
            throw error;
        }
    }

    async addClientTransaction(clientId, transactionData) {
        try {
            const transactionsRef = collection(this.db, 'libro_nero_clients', clientId, 'transactions');
            const docRef = await addDoc(transactionsRef, transactionData);
            return docRef.id;
        } catch (error) {
            console.error('Error adding client transaction:', error);
            throw error;
        }
    }

    async deleteClientTransaction(clientId, transactionId) {
        try {
            const transactionRef = doc(this.db, 'libro_nero_clients', clientId, 'transactions', transactionId);
            await deleteDoc(transactionRef);
            return true;
        } catch (error) {
            console.error('Error deleting client transaction:', error);
            throw error;
        }
    }

    async clearAllClientTransactions(clientId) {
        try {
            const transactions = await this.getClientTransactions(clientId);
            const deletePromises = transactions.map(transaction => 
                this.deleteClientTransaction(clientId, transaction.id)
            );
            await Promise.all(deletePromises);
            return true;
        } catch (error) {
            console.error('Error clearing all client transactions:', error);
            throw error;
        }
    }
    // Authentication helper
    async validateCredentials(username, password) {
        try {
            // Check credentials against database
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