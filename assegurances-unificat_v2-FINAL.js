.assegurances-container {
    padding: 20px;
}

/* TABS PRINCIPALS */
.assegurances-tabs-main {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
    border-bottom: 2px solid var(--color-border);
}

.tab-btn-main {
    padding: 12px 18px;
    border: none;
    background-color: transparent;
    color: var(--color-text-light);
    font-weight: 600;
    cursor: pointer;
    border-bottom: 3px solid transparent;
    transition: var(--transition);
    font-size: 14px;
}

.tab-btn-main:hover {
    color: var(--color-primary);
}

.tab-btn-main.active {
    color: var(--color-primary);
    border-bottom-color: var(--color-primary);
}

/* TABS SECUNDARIS */
.assegurances-tabs-sub {
    display: flex;
    gap: 8px;
    margin: 20px 0 15px 0;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--color-border);
}

.tab-btn-sub {
    padding: 8px 14px;
    border: none;
    background-color: transparent;
    color: var(--color-text-light);
    font-weight: 500;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    transition: var(--transition);
    font-size: 13px;
}

.tab-btn-sub:hover {
    color: var(--color-primary);
}

.tab-btn-sub.active {
    color: var(--color-primary);
    border-bottom-color: var(--color-primary);
}

/* ANIMACIONS */
.tab-content-main,
.subtab-content {
    display: none;
    animation: fadeIn 0.3s ease;
}

.tab-content-main.active,
.subtab-content.active {
    display: block;
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* HEADERS */
.assegurances-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 15px;
    border-bottom: 1px solid var(--color-border);
}

.assegurances-header h3 {
    margin: 0;
    color: var(--color-primary);
    font-size: 18px;
    font-weight: 600;
}

/* CONTROLS */
.assegurances-controls {
    display: flex;
    gap: 12px;
    align-items: center;
}

.assegurances-controls label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    cursor: pointer;
    color: var(--color-text);
}

.assegurances-controls input[type="checkbox"] {
    cursor: pointer;
}

.selector-campanya,
.selector-exercici {
    padding: 8px 12px;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    font-size: 13px;
    background-color: var(--color-bg-card);
    cursor: pointer;
}

.selector-campanya:focus,
.selector-exercici:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px rgba(45, 80, 22, 0.1);
}

/* BOTONS */
.btn-nova {
    padding: 10px 16px;
    background-color: var(--color-primary);
    color: white;
    border: none;
    border-radius: 4px;
    font-weight: 600;
    cursor: pointer;
    font-size: 14px;
    transition: var(--transition);
    white-space: nowrap;
}

.btn-nova:hover {
    background-color: var(--color-primary-light);
}

/* CARDS */
.cards-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 16px;
    margin-top: 20px;
}

.card-polissa {
    background-color: var(--color-bg-card);
    border: 1px solid var(--color-border);
    border-radius: 6px;
    overflow: hidden;
    box-shadow: var(--shadow-sm);
    transition: var(--transition);
}

.card-polissa:hover {
    box-shadow: var(--shadow-md);
    border-color: var(--color-primary);
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 12px;
    background-color: var(--color-bg);
    border-bottom: 1px solid var(--color-border);
}

.card-header h4 {
    margin: 0;
    color: var(--color-primary);
    font-size: 14px;
    font-weight: 600;
}

.badge-estat {
    display: inline-block;
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;
    white-space: nowrap;
    background-color: var(--color-success);
    color: white;
}

.card-body {
    padding: 12px;
    font-size: 13px;
}

.card-body p {
    margin: 6px 0;
    line-height: 1.4;
}

.card-body strong {
    color: var(--color-text);
}

.card-footer {
    display: flex;
    gap: 6px;
    padding: 10px;
    background-color: var(--color-bg);
    border-top: 1px solid var(--color-border);
    justify-content: center;
}

/* BOTONS PETITS */
.btn-small {
    padding: 8px 12px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
    transition: var(--transition);
    font-weight: 500;
}

.btn-veure {
    background-color: #e3f2fd;
    color: #1976d2;
    flex: 1;
}

.btn-veure:hover {
    background-color: #bbdefb;
}

.btn-editar {
    background-color: #e3f2fd;
    color: #1976d2;
}

.btn-editar:hover {
    background-color: #bbdefb;
}

.btn-eliminar {
    background-color: #ffebee;
    color: var(--color-error);
}

.btn-eliminar:hover {
    background-color: #ffcdd2;
}

/* TAULA */
.taula-standard {
    width: 100%;
    border-collapse: collapse;
    background-color: var(--color-bg-card);
    border-radius: 4px;
    overflow: hidden;
    box-shadow: var(--shadow-sm);
    margin-top: 15px;
}

.taula-standard thead {
    background-color: var(--color-bg);
    border-bottom: 2px solid var(--color-border);
}

.taula-standard th {
    padding: 12px;
    text-align: left;
    font-weight: 600;
    color: var(--color-text);
    font-size: 12px;
    text-transform: uppercase;
}

.taula-standard td {
    padding: 12px;
    border-bottom: 1px solid var(--color-border);
    font-size: 13px;
}

.taula-standard tbody tr:hover {
    background-color: var(--color-bg);
}

.taula-standard tr:last-child td {
    border-bottom: none;
}

.accions-cell {
    display: flex;
    gap: 6px;
    justify-content: center;
}

/* MISSATGES */
.no-data {
    padding: 40px 20px;
    text-align: center;
    color: var(--color-text-light);
    font-size: 14px;
    background-color: var(--color-bg);
    border-radius: 4px;
    margin-top: 20px;
}

.error-message {
    padding: 20px;
    background-color: #ffebee;
    color: var(--color-error);
    border-radius: 4px;
    margin-top: 20px;
    font-size: 13px;
}

/* RESPONSIVE */
@media (max-width: 768px) {
    .assegurances-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 10px;
    }
    
    .assegurances-controls {
        width: 100%;
        flex-direction: column;
    }
    
    .selector-campanya,
    .selector-exercici,
    .btn-nova {
        width: 100%;
    }
    
    .cards-grid {
        grid-template-columns: 1fr;
    }
    
    .assegurances-tabs-main,
    .assegurances-tabs-sub {
        flex-wrap: wrap;
    }
    
    .tab-btn-main,
    .tab-btn-sub {
        font-size: 12px;
        padding: 8px 12px;
    }
    
    .taula-standard {
        font-size: 12px;
    }
    
    .taula-standard th,
    .taula-standard td {
        padding: 8px;
    }
    
    .card-footer {
        flex-direction: column;
    }
    
    .btn-small {
        width: 100%;
    }
}

/* PRINT */
@media print {
    .assegurances-header,
    .tab-btn-main,
    .tab-btn-sub,
    .assegurances-controls,
    .btn-nova,
    .btn-small,
    .card-footer {
        display: none;
    }
    
    .card-polissa,
    .taula-standard {
        page-break-inside: avoid;
    }
}