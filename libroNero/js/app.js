// Gestione dello stato dell'applicazione
class BarCreditApp {
    constructor() {
        this.db = null;
        this.selectedClientId = null;
        this.clientsUnsubscribe = null;
        this.transactionsUnsubscribe = null;
        this.clientsData = new Map();
        
        this.init();
    }

    async init() {
        // Attende che Firebase sia disponibile
        await this.waitForFirebase();
        this.setupEventListeners();
        this.loadClients();
    }

    // Attende che Firebase sia inizializzato
    waitForFirebase() {
        return new Promise((resolve) => {
            const checkFirebase = () => {
                if (window.firebaseApp && window.firebaseApp.db) {
                    this.db = window.firebaseApp.db;
                    this.firestore = window.firebaseApp;
                    resolve();
                } else {
                    setTimeout(checkFirebase, 100);
                }
            };
            checkFirebase();
        });
    }

    // Setup degli event listeners
    setupEventListeners() {
        // Form aggiunta cliente
        document.getElementById('add-client-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addClient();
        });

        // Form aggiunta transazione
        document.getElementById('add-transaction-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addTransaction();
        });

        // Pulsante azzera tutto
        document.getElementById('clear-all-transactions').addEventListener('click', () => {
            this.clearAllTransactions();
        });
    }

    // Carica la lista dei clienti
    loadClients() {
        try {
            const clientsRef = this.firestore.collection(this.db, 'clients');
            const q = this.firestore.query(clientsRef, this.firestore.orderBy('name'));
            
            this.clientsUnsubscribe = this.firestore.onSnapshot(q, (snapshot) => {
                this.renderClients(snapshot.docs);
            }, (error) => {
                console.error('Errore nel caricamento clienti:', error);
                this.showMessage('Errore nel caricamento dei clienti', 'error');
            });
        } catch (error) {
            console.error('Errore nell\'impostazione del listener clienti:', error);
            this.showMessage('Errore nella connessione al database', 'error');
        }
    }

    // Renderizza la lista dei clienti
    async renderClients(clientDocs) {
        const clientsList = document.getElementById('clients-list');
        
        if (clientDocs.length === 0) {
            clientsList.innerHTML = '<div class="empty-state">Nessun cliente presente.<br>Aggiungi il primo cliente!</div>';
            return;
        }

        // Calcola i saldi per tutti i clienti
        const clientsWithBalance = await Promise.all(
            clientDocs.map(async (doc) => {
                const balance = await this.calculateClientBalance(doc.id);
                return {
                    id: doc.id,
                    data: doc.data(),
                    balance: balance
                };
            })
        );

        clientsList.innerHTML = clientsWithBalance.map(client => `
            <div class="client-item ${client.id === this.selectedClientId ? 'active' : ''}" 
                 data-client-id="${client.id}" onclick="app.selectClient('${client.id}')">
                <span class="client-name">${client.data.name}</span>
                <span class="client-balance-preview ${client.balance > 0 ? 'positive' : client.balance < 0 ? 'negative' : ''}">
                    €${client.balance.toFixed(2)}
                </span>
            </div>
        `).join('');
    }

    // Calcola il saldo di un cliente
    async calculateClientBalance(clientId) {
        try {
            const transactionsRef = this.firestore.collection(this.db, 'clients', clientId, 'transactions');
            const snapshot = await this.firestore.getDocs(transactionsRef);
            
            let balance = 0;
            snapshot.forEach(doc => {
                balance += doc.data().amount || 0;
            });
            
            return balance;
        } catch (error) {
            console.error('Errore nel calcolo del saldo:', error);
            return 0;
        }
    }

    // Aggiunge un nuovo cliente
    async addClient() {
        const nameInput = document.getElementById('client-name');
        const name = nameInput.value.trim();
        
        if (!name) {
            this.showMessage('Inserisci il nome del cliente', 'error');
            return;
        }

        try {
            const clientsRef = this.firestore.collection(this.db, 'clients');
            await this.firestore.addDoc(clientsRef, {
                name: name,
                createdAt: this.firestore.serverTimestamp()
            });
            
            nameInput.value = '';
            this.showMessage('Cliente aggiunto con successo', 'success');
        } catch (error) {
            console.error('Errore nell\'aggiunta del cliente:', error);
            this.showMessage('Errore nell\'aggiunta del cliente', 'error');
        }
    }

    // Seleziona un cliente
    selectClient(clientId) {
        this.selectedClientId = clientId;
        
        // Aggiorna la UI
        document.querySelectorAll('.client-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-client-id="${clientId}"]`).classList.add('active');
        
        // Mostra i dettagli del cliente
        this.showClientDetails(clientId);
        this.loadTransactions(clientId);
    }

    // Mostra i dettagli del cliente selezionato
    async showClientDetails(clientId) {
        const noSelection = document.getElementById('no-client-selected');
        const clientDetails = document.getElementById('client-details');
        
        noSelection.style.display = 'none';
        clientDetails.style.display = 'block';
        
        // Ottieni i dati del cliente
        try {
            const clientDoc = await this.firestore.doc(this.db, 'clients', clientId);
            const clientSnapshot = await this.firestore.getDocs(this.firestore.query(
                this.firestore.collection(this.db, 'clients')
            ));
            
            let clientData = null;
            clientSnapshot.forEach(doc => {
                if (doc.id === clientId) {
                    clientData = doc.data();
                }
            });
            
            if (clientData) {
                document.getElementById('selected-client-name').textContent = clientData.name;
                await this.updateClientBalance(clientId);
            }
        } catch (error) {
            console.error('Errore nel caricamento dei dettagli cliente:', error);
            this.showMessage('Errore nel caricamento dei dettagli', 'error');
        }
    }

    // Aggiorna il saldo del cliente
    async updateClientBalance(clientId) {
        const balance = await this.calculateClientBalance(clientId);
        const balanceElement = document.getElementById('client-balance');
        
        balanceElement.textContent = `€${balance.toFixed(2)}`;
        balanceElement.className = 'balance ' + (balance > 0 ? 'positive' : balance < 0 ? 'negative' : 'zero');
    }

    // Carica le transazioni del cliente
    loadTransactions(clientId) {
        // Unsubscribe dal listener precedente se presente
        if (this.transactionsUnsubscribe) {
            this.transactionsUnsubscribe();
        }

        try {
            const transactionsRef = this.firestore.collection(this.db, 'clients', clientId, 'transactions');
            const q = this.firestore.query(transactionsRef, this.firestore.orderBy('timestamp', 'desc'));
            
            this.transactionsUnsubscribe = this.firestore.onSnapshot(q, (snapshot) => {
                this.renderTransactions(snapshot.docs, clientId);
                this.updateClientBalance(clientId);
            }, (error) => {
                console.error('Errore nel caricamento delle transazioni:', error);
                this.showMessage('Errore nel caricamento delle transazioni', 'error');
            });
        } catch (error) {
            console.error('Errore nell\'impostazione del listener transazioni:', error);
            this.showMessage('Errore nella connessione al database', 'error');
        }
    }

    // Renderizza le transazioni
    renderTransactions(transactionDocs, clientId) {
        const transactionsList = document.getElementById('transactions-list');
        
        if (transactionDocs.length === 0) {
            transactionsList.innerHTML = '<div class="empty-state">Nessuna transazione presente</div>';
            return;
        }

        transactionsList.innerHTML = transactionDocs.map(doc => {
            const data = doc.data();
            const amount = data.amount || 0;
            const date = data.timestamp ? data.timestamp.toDate() : new Date();
            
            return `
                <div class="transaction-item">
                    <div class="transaction-info">
                        <span class="transaction-amount ${amount >= 0 ? 'positive' : 'negative'}">
                            ${amount >= 0 ? '+' : ''}€${amount.toFixed(2)}
                        </span>
                        <span class="transaction-date">
                            ${date.toLocaleDateString('it-IT')} ${date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                    <button class="delete-transaction" onclick="app.deleteTransaction('${clientId}', '${doc.id}')">
                        Elimina
                    </button>
                </div>
            `;
        }).join('');
    }

    // Aggiunge una transazione
    async addTransaction() {
        if (!this.selectedClientId) {
            this.showMessage('Seleziona prima un cliente', 'error');
            return;
        }

        const amountInput = document.getElementById('transaction-amount');
        const amount = parseFloat(amountInput.value);
        
        if (isNaN(amount) || amount === 0) {
            this.showMessage('Inserisci un importo valido', 'error');
            return;
        }

        try {
            const transactionsRef = this.firestore.collection(this.db, 'clients', this.selectedClientId, 'transactions');
            await this.firestore.addDoc(transactionsRef, {
                amount: amount,
                timestamp: this.firestore.serverTimestamp()
            });
            
            amountInput.value = '';
            this.showMessage('Transazione aggiunta con successo', 'success');
        } catch (error) {
            console.error('Errore nell\'aggiunta della transazione:', error);
            this.showMessage('Errore nell\'aggiunta della transazione', 'error');
        }
    }

    // Elimina una transazione
    async deleteTransaction(clientId, transactionId) {
        if (!confirm('Sei sicuro di voler eliminare questa transazione?')) {
            return;
        }

        try {
            const transactionRef = this.firestore.doc(this.db, 'clients', clientId, 'transactions', transactionId);
            await this.firestore.deleteDoc(transactionRef);
            
            this.showMessage('Transazione eliminata', 'success');
        } catch (error) {
            console.error('Errore nell\'eliminazione della transazione:', error);
            this.showMessage('Errore nell\'eliminazione della transazione', 'error');
        }
    }

    // Elimina tutte le transazioni di un cliente
    async clearAllTransactions() {
        if (!this.selectedClientId) {
            this.showMessage('Seleziona prima un cliente', 'error');
            return;
        }

        if (!confirm('Sei sicuro di voler eliminare TUTTE le transazioni di questo cliente? Questa azione non può essere annullata.')) {
            return;
        }

        try {
            const transactionsRef = this.firestore.collection(this.db, 'clients', this.selectedClientId, 'transactions');
            const snapshot = await this.firestore.getDocs(transactionsRef);
            
            // Elimina tutte le transazioni
            const deletePromises = [];
            snapshot.forEach(doc => {
                deletePromises.push(this.firestore.deleteDoc(doc.ref));
            });
            
            await Promise.all(deletePromises);
            this.showMessage('Tutte le transazioni sono state eliminate', 'success');
        } catch (error) {
            console.error('Errore nell\'eliminazione delle transazioni:', error);
            this.showMessage('Errore nell\'eliminazione delle transazioni', 'error');
        }
    }

    // Mostra un messaggio all'utente
    showMessage(text, type = 'success') {
        const container = document.getElementById('message-container');
        
        const message = document.createElement('div');
        message.className = `message ${type}`;
        message.textContent = text;
        
        container.appendChild(message);
        
        // Rimuove il messaggio dopo 3 secondi
        setTimeout(() => {
            if (message.parentNode) {
                message.parentNode.removeChild(message);
            }
        }, 3000);
    }

    // Cleanup quando l'app viene chiusa
    destroy() {
        if (this.clientsUnsubscribe) {
            this.clientsUnsubscribe();
        }
        if (this.transactionsUnsubscribe) {
            this.transactionsUnsubscribe();
        }
    }
}

// Inizializza l'applicazione quando il DOM è pronto
document.addEventListener('DOMContentLoaded', () => {
    window.app = new BarCreditApp();
});

// Cleanup quando la pagina viene chiusa
window.addEventListener('beforeunload', () => {
    if (window.app) {
        window.app.destroy();
    }
});