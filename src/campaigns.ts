import { Campaign } from './types';
import { dbService } from './db';

export const getCampaigns = async (): Promise<Campaign[]> => {
  return await dbService.getCampaigns();
};

export const saveCampaigns = async (campaigns: Campaign[]) => {
  // Not used broadly as individual updates are better
};

export const updateCampaignName = async (campaignId: string, newName: string) => {
  const campaigns = await getCampaigns();
  const cToUpdate = campaigns.find(c => c.id === campaignId);
  if (cToUpdate) {
    const updatedCampaign = { ...cToUpdate, name: newName };
    await dbService.updateCampaign(updatedCampaign);
  }
  return await getCampaigns();
};


export const updateCampaignPrivacy = async (campaignId: string, sharePrivacy: 'PUBLIC' | 'PRIVATE' | 'CUSTOMERS') => {
  const campaigns = await getCampaigns();
  const cToUpdate = campaigns.find(c => c.id === campaignId);
  if (cToUpdate) {
    const updatedCampaign = { ...cToUpdate, sharePrivacy };
    await dbService.updateCampaign(updatedCampaign);
  }
  return await getCampaigns();
};

export const updateCampaignBenefits = async (campaignId: string, benefits: any) => {
  const campaigns = await getCampaigns();
  const cToUpdate = campaigns.find(c => c.id === campaignId);
  if (cToUpdate) {
    const updatedCampaign = { ...cToUpdate, benefits };
    await dbService.updateCampaign(updatedCampaign);
  }
  return await getCampaigns();
};

export const updateCampaignSocialProof = async (campaignId: string, socialProof: any) => {
  const campaigns = await getCampaigns();
  const cToUpdate = campaigns.find(c => c.id === campaignId);
  if (cToUpdate) {
    const updatedCampaign = { ...cToUpdate, socialProof };
    await dbService.updateCampaign(updatedCampaign);
  }
  return await getCampaigns();
};

export const updateCampaignCTA = async (campaignId: string, ctaConfig: any) => {
  const campaigns = await getCampaigns();
  const cToUpdate = campaigns.find(c => c.id === campaignId);
  if (cToUpdate) {
    const updatedCampaign = { ...cToUpdate, ctaConfig };
    await dbService.updateCampaign(updatedCampaign);
  }
  return await getCampaigns();
};

export const updateCampaignTimeline = async (campaignId: string, startDate?: string, endDate?: string) => {
  const campaigns = await getCampaigns();
  const cToUpdate = campaigns.find(c => c.id === campaignId);
  if (cToUpdate) {
    const updatedCampaign = { ...cToUpdate, startDate, endDate };
    await dbService.updateCampaign(updatedCampaign);
  }
  return await getCampaigns();
};

export const updateCampaignFulfillment = async (campaignId: string, fulfillmentSettings: any) => {
  const campaigns = await getCampaigns();
  const cToUpdate = campaigns.find(c => c.id === campaignId);
  if (cToUpdate) {
    const updatedCampaign = { ...cToUpdate, fulfillmentSettings };
    await dbService.updateCampaign(updatedCampaign);
  }
  return await getCampaigns();
};

