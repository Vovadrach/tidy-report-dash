import { Report, Client } from "@/types/report";

const REPORTS_KEY = "cleaning_reports";
const CLIENTS_KEY = "cleaning_clients";

export const storage = {
  // Reports
  getReports: (): Report[] => {
    const data = localStorage.getItem(REPORTS_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveReports: (reports: Report[]): void => {
    localStorage.setItem(REPORTS_KEY, JSON.stringify(reports));
  },

  addReport: (report: Report): void => {
    const reports = storage.getReports();
    reports.push(report);
    storage.saveReports(reports);
  },

  updateReport: (reportId: string, updatedReport: Partial<Report>): void => {
    const reports = storage.getReports();
    const index = reports.findIndex((r) => r.id === reportId);
    if (index !== -1) {
      reports[index] = { ...reports[index], ...updatedReport };
      storage.saveReports(reports);
    }
  },

  deleteReport: (reportId: string): void => {
    const reports = storage.getReports().filter((r) => r.id !== reportId);
    storage.saveReports(reports);
  },

  // Clients
  getClients: (): Client[] => {
    const data = localStorage.getItem(CLIENTS_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveClients: (clients: Client[]): void => {
    localStorage.setItem(CLIENTS_KEY, JSON.stringify(clients));
  },

  addClient: (client: Client): void => {
    const clients = storage.getClients();
    clients.push(client);
    storage.saveClients(clients);
  },

  updateClient: (clientId: string, updatedClient: Partial<Client>): void => {
    const clients = storage.getClients();
    const index = clients.findIndex((c) => c.id === clientId);
    if (index !== -1) {
      clients[index] = { ...clients[index], ...updatedClient };
      storage.saveClients(clients);
    }
  },

  deleteClient: (clientId: string): void => {
    const clients = storage.getClients().filter((c) => c.id !== clientId);
    storage.saveClients(clients);
  },
};
