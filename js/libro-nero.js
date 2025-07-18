import FirebaseAPI from './firebase.js';
import { MobileMenuManager } from './utils/MobileMenuManager.js';
import { ErrorHandler } from './utils/ErrorHandler.js';
import { SecurityUtils } from './utils/SecurityUtils.js';

class LibroNeroManager {
    constructor() {
        this.currentUser = this.getCurrentUser();
        this.selectedClientId = null;
        this.clientsData = new Map();
        this.clientsUnsubscribe = null;
        this.transactionsUnsubscribe = null;
        
        if (!this.currentUser) {
            window.location.href = 'index.html';
            return;
        }

        this.init();
    }

    getCurrentUser() {
        const userStr = localStorage.getItem('currentUser');
        return userStr ? JSON.parse(userStr) : null;
    }

    async init() {
        this.setupUI();
        this.setupEventListeners();
        this.mobileMenuManager = new MobileMenuManager();
        await this.loadClients();
    }

    setupUI() {
        document.getElementById('user-info').textContent = this.currentUser.username;
        
        // Show admin link if user is admin
        if (this.currentUser.role === 'admin') {
            document.getElementById('admin-link').style.display = 'block';
        }
    }

    setupEventListeners() {
        // Logout
        document.getElementById('logout-btn').addEventListener('click', () => {
            this.logout();
        });

        // Add client form
        document.getElementById('add-client-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addClient();
        });

        // Add transaction form
        document.getElementById('add-transaction-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addTransaction();
        });

        // Quick amount buttons
        document.querySelectorAll('.quick-amount-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const amount = parseFloat(e.target.dataset.amount);
                this.addQuickTransaction(amount);
            });
        });

        // Clear all transactions
        document.getElementById('clear-all-transactions').addEventListener('click', () => {
            this.clearAllTransactions();
        });

        // Export transactions
        document.getElementById('export-transactions').addEventListener('click', () => {
            this.exportTransactions();
        });

        // Delete client
        document.getElementById('delete-client-btn').addEventListener('click', () => {
            this.deleteClient();
        });

        // Modal close handlers
        this.setupModalHandlers();
    }

    setupModalHandlers() {
        const modal = document.getElementById('confirm-modal');
        const closeButtons = modal.querySelectorAll('.modal-close');
        
        closeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.hideConfirmModal();
            });
        });

        // Close on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hideConfirmModal();
            }
        });
    }

    async loadClients() {
        this.showLoading(true);
        
        try {
            const clients = await FirebaseAPI.getLibroNeroClients();
            
            // Calculate balances for each client
            const clientsWithBalances = await Promise.all(
                clients.map(async (client) => {
                    const balance = await this.calculateClientBalance(client.id);
                    return { ...client, balance };
                })
            );
            
            await this.renderClients(clientsWithBalances);
        } catch (error) {
            console.error('Error loading clients:', error);
            ErrorHandler.showError('Errore nel caricamento dei clienti');
        } finally {
            this.showLoading(false);
        }
    }


    async calculateClientBalance(clientId) {
        try {
            const transactions = await FirebaseAPI.getClientTransactions(clientId);
            
            let balance = 0;
            transactions.forEach(transaction => {
                balance += transaction.amount || 0;
            });
            
            return balance;
        } catch (error) {
            console.error('Error calculating balance:', error);
            return 0;
        }
    }

    async renderClients(clients) {
        const clientsList = document.getElementById('clients-list');
        
        if (clients.length === 0) {
            clientsList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">👥</div>
                    <p>Nessun cliente presente.<br>Aggiungi il primo cliente!</p>
                </div>
            `;
            return;
        }

        // Sort clients by name
        const sortedClients = clients.sort((a, b) => 
            a.name.localeCompare(b.name)
        );

        clientsList.innerHTML = sortedClients.map(client => `
            <div class="client-item ${client.id === this.selectedClientId ? 'active' : ''}" 
                 data-client-id="${client.id}" onclick="libroNero.selectClient('${client.id}')">
                <div class="client-name">${SecurityUtils.sanitizeHTML(client.name)}</div>
                <div class="client-balance-preview ${client.balance > 0 ? 'positive' : client.balance < 0 ? 'negative' : ''}">
                    €${client.balance.toFixed(2)}
                </div>
            </div>
        `).join('');
    }

    async addClient() {
        const nameInput = document.getElementById('client-name');
        const name = SecurityUtils.sanitizeInput(nameInput.value);
        
        if (!name || name.length < 2) {
            ErrorHandler.showError('Inserisci un nome valido (almeno 2 caratteri)');
            return;
        }

        this.showLoading(true);

        try {
            // Check if client already exists
            const existingClients = await FirebaseAPI.getLibroNeroClients();
            const nameExists = existingClients.some(client => 
                client.name.toLowerCase() === name.toLowerCase()
            );

            if (nameExists) {
                ErrorHandler.showError('Esiste già un cliente con questo nome');
                return;
            }

            await FirebaseAPI.createLibroNeroClient({
                name: name,
                createdAt: new Date(),
                createdBy: this.currentUser.username
            });
            
            nameInput.value = '';
            ErrorHandler.showSuccess('Cliente aggiunto con successo');
            await this.loadClients();
            
        } catch (error) {
            console.error('Error adding client:', error);
            ErrorHandler.showError('Errore nell\'aggiunta del cliente');
        } finally {
            this.showLoading(false);
        }
    }

    async selectClient(clientId) {
        this.selectedClientId = clientId;
        
        // Update UI
        document.querySelectorAll('.client-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-client-id="${clientId}"]`).classList.add('active');
        
        // Show client details
        await this.showClientDetails(clientId);
        await this.loadTransactions(clientId);
    }

    async showClientDetails(clientId) {
        const noSelection = document.getElementById('no-client-selected');
        const clientDetails = document.getElementById('client-details');
        
        noSelection.style.display = 'none';
        clientDetails.style.display = 'flex';
        
        try {
            const client = await FirebaseAPI.getLibroNeroClient(clientId);
            
            if (client) {
                document.getElementById('selected-client-name').textContent = client.name;
                await this.updateClientBalance(clientId);
            }
        } catch (error) {
            console.error('Error loading client details:', error);
            ErrorHandler.showError('Errore nel caricamento dei dettagli cliente');
        }
    }

    async updateClientBalance(clientId) {
        try {
            const balance = await this.calculateClientBalance(clientId);
            const balanceElement = document.getElementById('client-balance');
            
            balanceElement.textContent = `€${balance.toFixed(2)}`;
            balanceElement.className = 'balance ' + (balance > 0 ? 'positive' : balance < 0 ? 'negative' : 'zero');
        } catch (error) {
            console.error('Error updating balance:', error);
        }
    }

    async loadTransactions(clientId) {
        try {
            const transactions = await FirebaseAPI.getClientTransactions(clientId);
            
            this.renderTransactions(transactions, clientId);
            
        } catch (error) {
            console.error('Error loading transactions:', error);
            ErrorHandler.showError('Errore nel caricamento delle transazioni');
        }
    }

    renderTransactions(transactions, clientId) {
        const transactionsList = document.getElementById('transactions-list');
        
        if (transactions.length === 0) {
            transactionsList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">💰</div>
                    <p>Nessuna transazione presente</p>
                </div>
            `;
            return;
        }

        transactionsList.innerHTML = transactions.map(transaction => {
            const amount = transaction.amount || 0;
            const date = transaction.timestamp && transaction.timestamp.toDate ? 
                transaction.timestamp.toDate() : new Date(transaction.timestamp);
            
            return `
                <div class="transaction-item">
                    <div class="transaction-main">
                        <div class="transaction-info">
                            <div class="transaction-amount ${amount >= 0 ? 'positive' : 'negative'}">
                                ${amount >= 0 ? '+' : ''}€${amount.toFixed(2)}
                            </div>
                            ${transaction.description ? `<div class="transaction-description">${SecurityUtils.sanitizeHTML(transaction.description)}</div>` : ''}
                        </div>
                        <div class="transaction-meta">
                            <div class="transaction-date">
                                ${date.toLocaleDateString('it-IT')} ${date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <div class="transaction-user">
                                ${SecurityUtils.sanitizeHTML(transaction.addedBy || 'Sconosciuto')}
                            </div>
                        </div>
                    </div>
                    <div class="transaction-actions">
                        <button class="delete-transaction" onclick="libroNero.deleteTransaction('${clientId}', '${transaction.id}')">
                            🗑️
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    async addTransaction() {
        if (!this.selectedClientId) {
            ErrorHandler.showError('Seleziona prima un cliente');
            return;
        }

        const amountInput = document.getElementById('transaction-amount');
        const descriptionInput = document.getElementById('transaction-description');
        
        const amount = parseFloat(amountInput.value);
        const description = SecurityUtils.sanitizeInput(descriptionInput.value);
        
        if (isNaN(amount) || amount === 0) {
            ErrorHandler.showError('Inserisci un importo valido');
            return;
        }

        await this.saveTransaction(amount, description);
    }

    async addQuickTransaction(amount) {
        if (!this.selectedClientId) {
            ErrorHandler.showError('Seleziona prima un cliente');
            return;
        }

        const description = amount > 0 ? 'Ricarica rapida' : 'Consumazione rapida';
        await this.saveTransaction(amount, description);
    }

    async saveTransaction(amount, description = '') {
        this.showLoading(true);

        try {
            const transactionData = {
                amount: amount,
                description: description,
                timestamp: new Date(),
                addedBy: this.currentUser.username
            };

            await FirebaseAPI.addClientTransaction(this.selectedClientId, transactionData);
            
            // Clear form
            document.getElementById('transaction-amount').value = '';
            document.getElementById('transaction-description').value = '';
            
            ErrorHandler.showSuccess('Transazione aggiunta con successo');
            
            // Reload data
            await this.updateClientBalance(this.selectedClientId);
            await this.loadTransactions(this.selectedClientId);
            await this.loadClients(); // Update balance in sidebar
            
        } catch (error) {
            console.error('Error adding transaction:', error);
            ErrorHandler.showError('Errore nell\'aggiunta della transazione');
        } finally {
            this.showLoading(false);
        }
    }

    async deleteTransaction(clientId, transactionId) {
        this.showConfirmModal(
            'Elimina Transazione',
            'Sei sicuro di voler eliminare questa transazione?',
            async () => {
                this.showLoading(true);
                
                try {
                    await FirebaseAPI.deleteClientTransaction(clientId, transactionId);
                    
                    ErrorHandler.showSuccess('Transazione eliminata');
                    
                    // Reload data
                    await this.updateClientBalance(clientId);
                    await this.loadTransactions(clientId);
                    await this.loadClients();
                    
                } catch (error) {
                    console.error('Error deleting transaction:', error);
                    ErrorHandler.showError('Errore nell\'eliminazione della transazione');
                } finally {
                    this.showLoading(false);
                }
            }
        );
    }

    async clearAllTransactions() {
        if (!this.selectedClientId) {
            ErrorHandler.showError('Seleziona prima un cliente');
            return;
        }

        const clientName = document.getElementById('selected-client-name').textContent;
        
        this.showConfirmModal(
            'Azzera Tutte le Transazioni',
            `Sei sicuro di voler eliminare TUTTE le transazioni di "${clientName}"?<br><br>Questa azione non può essere annullata.`,
            async () => {
                this.showLoading(true);
                
                try {
                    await FirebaseAPI.clearAllClientTransactions(this.selectedClientId);
                    
                    ErrorHandler.showSuccess('Tutte le transazioni sono state eliminate');
                    
                    // Reload data
                    await this.updateClientBalance(this.selectedClientId);
                    await this.loadTransactions(this.selectedClientId);
                    await this.loadClients();
                    
                } catch (error) {
                    console.error('Error clearing transactions:', error);
                    ErrorHandler.showError('Errore nell\'eliminazione delle transazioni');
                } finally {
                    this.showLoading(false);
                }
            }
        );
    }

    async deleteClient() {
        if (!this.selectedClientId) {
            return;
        }

        const clientName = document.getElementById('selected-client-name').textContent;
        
        this.showConfirmModal(
            'Elimina Cliente',
            `Sei sicuro di voler eliminare il cliente "${clientName}"?<br><br>Verranno eliminate anche tutte le sue transazioni. Questa azione non può essere annullata.`,
            async () => {
                this.showLoading(true);
                
                try {
                    await FirebaseAPI.deleteLibroNeroClientWithTransactions(this.selectedClientId);
                    
                    ErrorHandler.showSuccess('Cliente eliminato con successo');
                    
                    // Reset UI
                    this.selectedClientId = null;
                    document.getElementById('no-client-selected').style.display = 'flex';
                    document.getElementById('client-details').style.display = 'none';
                    
                    // Reload clients
                    await this.loadClients();
                    
                } catch (error) {
                    console.error('Error deleting client:', error);
                    ErrorHandler.showError('Errore nell\'eliminazione del cliente');
                } finally {
                    this.showLoading(false);
                }
            }
        );
    }

    async exportTransactions() {
        if (!this.selectedClientId) {
            ErrorHandler.showError('Seleziona prima un cliente');
            return;
        }

        try {
            const clientName = document.getElementById('selected-client-name').textContent;
            const transactions = await FirebaseAPI.getClientTransactions(this.selectedClientId);
            
            if (transactions.length === 0) {
                ErrorHandler.showError('Nessuna transazione da esportare');
                return;
            }

            // Create CSV content
            let csvContent = `Transazioni - ${clientName}\n`;
            csvContent += `Esportato il: ${new Date().toLocaleDateString('it-IT')}\n\n`;
            csvContent += 'Data,Ora,Importo,Descrizione,Inserito da\n';
            
            transactions.forEach(transaction => {
                const date = transaction.timestamp && transaction.timestamp.toDate ? 
                    transaction.timestamp.toDate() : new Date(transaction.timestamp);
                const amount = transaction.amount || 0;
                const description = transaction.description || '';
                const addedBy = transaction.addedBy || 'Sconosciuto';
                
                csvContent += `${date.toLocaleDateString('it-IT')},${date.toLocaleTimeString('it-IT')},€${amount.toFixed(2)},"${description}","${addedBy}"\n`;
            });
            
            // Download CSV
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `transazioni_${clientName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            ErrorHandler.showSuccess('Transazioni esportate con successo');
            
        } catch (error) {
            console.error('Error exporting transactions:', error);
            ErrorHandler.showError('Errore nell\'esportazione delle transazioni');
        }
    }

    showConfirmModal(title, message, onConfirm) {
        const modal = document.getElementById('confirm-modal');
        const titleElement = document.getElementById('confirm-title');
        const messageElement = document.getElementById('confirm-message');
        const confirmBtn = document.getElementById('confirm-ok-btn');
        
        titleElement.textContent = title;
        messageElement.innerHTML = message;
        
        // Remove existing listeners
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        
        // Add new listener
        newConfirmBtn.addEventListener('click', () => {
            this.hideConfirmModal();
            onConfirm();
        });
        
        modal.style.display = 'block';
    }

    hideConfirmModal() {
        document.getElementById('confirm-modal').style.display = 'none';
    }

    showLoading(show) {
        const overlay = document.getElementById('loading-overlay');
        overlay.style.display = show ? 'flex' : 'none';
    }

    logout() {
        localStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    }

    // Cleanup when leaving page
    destroy() {
        if (this.clientsUnsubscribe) {
            this.clientsUnsubscribe();
        }
        if (this.transactionsUnsubscribe) {
            this.transactionsUnsubscribe();
        }
    }
}

// Initialize and make globally available
window.libroNero = new LibroNeroManager();

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.libroNero) {
        window.libroNero.destroy();
    }
});