import { db } from './firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc, getDoc, query, where, orderBy } from 'firebase/firestore';
import { Brand, Campaign, MenuItem, User } from './types';
import { mockBrands, mockCampaigns, mockMenuItems } from './data.mock';

export const dbService = {
  // BRANDS
  async getBrands(): Promise<Brand[]> {
    const brandsCol = collection(db, 'brands');
    const brandSnapshot = await getDocs(brandsCol);
    
    if (brandSnapshot.empty) {
      // Seed with mock
      const initialBrands = mockBrands.map(b => ({
        ...b,
        isActive: true,
        uploadTimestamp: new Date().toISOString(),
        lastModifiedTimestamp: new Date().toISOString(),
        modifiedBy: 'System'
      }));
      for (const brand of initialBrands) {
        await setDoc(doc(brandsCol, brand.id), brand);
      }
      return initialBrands;
    }
    
    return brandSnapshot.docs.map(doc => doc.data() as Brand);
  },

  async addBrand(brand: Brand) {
    await setDoc(doc(db, 'brands', brand.id), brand);
  },

  async updateBrand(brand: Brand) {
    await updateDoc(doc(db, 'brands', brand.id), brand as any);
  },

  async deleteBrand(brandId: string) {
    await deleteDoc(doc(db, 'brands', brandId));
  },

  // CAMPAIGNS
  async getCampaigns(): Promise<Campaign[]> {
    const col = collection(db, 'campaigns');
    const snapshot = await getDocs(col);
    
    if (snapshot.empty) {
      for (const c of mockCampaigns) {
        await setDoc(doc(col, c.id), c);
      }
      return mockCampaigns;
    }
    
    return snapshot.docs.map(doc => doc.data() as Campaign);
  },

  async addCampaign(campaign: Campaign) {
    await setDoc(doc(db, 'campaigns', campaign.id), campaign);
  },

  async updateCampaign(campaign: Campaign) {
    await updateDoc(doc(db, 'campaigns', campaign.id), campaign as any);
  },

  async deleteCampaign(campaignId: string) {
    await deleteDoc(doc(db, 'campaigns', campaignId));
  },

  // MENU ITEMS
  async getMenuItems(campaignId?: string): Promise<MenuItem[]> {
    const col = collection(db, 'menuItems');
    const snapshot = await getDocs(col);
    
    let items: MenuItem[] = [];
    if (snapshot.empty) {
      for (const i of mockMenuItems) {
        await setDoc(doc(col, i.id), i);
      }
      items = mockMenuItems;
    } else {
      items = snapshot.docs.map(doc => doc.data() as MenuItem);
      // Ensure all mock items are in DB
      for (const mockItem of mockMenuItems) {
        if (!items.find(i => i.id === mockItem.id)) {
          console.log(`Adding missing mock item to DB: ${mockItem.name}`);
          await setDoc(doc(col, mockItem.id), mockItem);
          items.push(mockItem);
        }
      }
    }
    
    if (campaignId) {
      return items.filter(i => i.campaignId === campaignId);
    }
    return items;
  },

  async addMenuItem(item: MenuItem) {
    await setDoc(doc(db, 'menuItems', item.id), item);
  },

  async updateMenuItem(item: MenuItem) {
    await updateDoc(doc(db, 'menuItems', item.id), item as any);
  },

  async deleteMenuItem(itemId: string) {
    await deleteDoc(doc(db, 'menuItems', itemId));
  },

  // ORDERS
  async getOrders(userId?: string, brandId?: string) {
    const snapshot = await getDocs(collection(db, 'orders'));
    let orders = snapshot.docs.map(doc => doc.data());
    
    if (userId) {
      orders = orders.filter((o: any) => o.userId === userId);
    }
    if (brandId) {
       // Filter orders related to a brand if needed. Currently orders likely have items with brandId.
       orders = orders.filter((o: any) => o.items && o.items.some((i: any) => i.brandId === brandId));
    }
    
    // Sort by chronological creation
    return orders.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async addOrder(order: any) {
    console.log(`[DB SERVICE RACE] addOrder called for path: orders/${order.id}`);
    console.log(`[DB SERVICE RACE] addOrder payload has undefined?`, Object.keys(order).filter(k => order[k] === undefined));
    try {
      await setDoc(doc(db, 'orders', order.id), order);
      console.log(`[DB SERVICE RACE] addOrder SUCCESS for path: orders/${order.id}`);
    } catch (err) {
      console.error(`[DB SERVICE RACE] addOrder DEFAULTED/FAILED for path: orders/${order.id}`, err);
      throw err;
    }
  },

  async getOrderByPaymentReference(paymentRef: string) {
    const ordersCol = collection(db, 'orders');
    const q = query(ordersCol, where('paymentReference', '==', paymentRef));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return snapshot.docs[0].data();
    }
    return null;
  },

  async updateOrder(orderId: string, updates: any) {
    console.log(`[DB SERVICE RACE] updateOrder called for path: orders/${orderId}`);
    try {
      await setDoc(doc(db, 'orders', orderId), updates, { merge: true });
      console.log(`[DB SERVICE RACE] updateOrder SUCCESS for path: orders/${orderId}`);
    } catch (err) {
      console.error(`[DB SERVICE RACE] updateOrder FAILED for path: orders/${orderId}`, err);
      throw err;
    }
  },

  // TRANSACTIONS
  async getTransactions(userId?: string) {
    const snapshot = await getDocs(collection(db, 'transactions'));
    let txns = snapshot.docs.map(doc => doc.data());
    if (userId) {
      txns = txns.filter((t: any) => t.userId === userId);
    }
    return txns.sort((a: any, b: any) => new Date(b.timestamp || b.date).getTime() - new Date(a.timestamp || a.date).getTime());
  },

  async addTransaction(txn: any) {
    await setDoc(doc(db, 'transactions', txn.id), txn);
  },

  // SUBSCRIPTIONS
  async getSubscriptions(userId?: string) {
    const snapshot = await getDocs(collection(db, 'subscriptions'));
    let subs = snapshot.docs.map(doc => doc.data());
    if (userId) {
      subs = subs.filter((t: any) => t.userId === userId);
    }
    return subs;
  },

  async addSubscription(sub: any) {
    await setDoc(doc(db, 'subscriptions', sub.id), sub);
  },
  
  // USERS
  async getUsers(): Promise<User[]> {
    const snapshot = await getDocs(collection(db, 'users'));
    return snapshot.docs.map(doc => doc.data() as User);
  },

  // AUDITS
  async getLogins() {
    const snapshot = await getDocs(collection(db, 'logins'));
    return snapshot.docs.map(doc => doc.data()).sort((a: any, b: any) => new Date(b.loginTime).getTime() - new Date(a.loginTime).getTime());
  },
  
  async addLoginAudit(audit: any) {
    await setDoc(doc(db, 'logins', audit.id), audit);
  },
  
  async updateLoginAudit(id: string, updates: any) {
    await updateDoc(doc(db, 'logins', id), updates);
  },

  // LEADS
  async addLead(lead: any) {
    await setDoc(doc(db, 'leads', lead.id), lead);
  },
  
  async getLeads(campaignId?: string) {
    const snapshot = await getDocs(collection(db, 'leads'));
    let leads = snapshot.docs.map(doc => doc.data());
    if (campaignId) {
      leads = leads.filter((l: any) => l.campaignId === campaignId);
    }
    return leads.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },

  // CAMPAIGN LOGS
  async addCampaignLog(log: any) {
    await setDoc(doc(db, 'campaignLogs', log.id), log);
  },

  async getCampaignLogs(campaignId: string) {
    const snapshot = await getDocs(collection(db, 'campaignLogs'));
    return snapshot.docs.map(doc => doc.data()).filter((l: any) => l.campaignId === campaignId).sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
};
