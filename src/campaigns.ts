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

export const updateCampaignServiceability = async (campaignId: string, serviceability: any) => {
  const campaigns = await getCampaigns();
  const cToUpdate = campaigns.find(c => c.id === campaignId);
  if (cToUpdate) {
    const updatedCampaign = { ...cToUpdate, serviceability };
    await dbService.updateCampaign(updatedCampaign);
  }
  return await getCampaigns();
};
