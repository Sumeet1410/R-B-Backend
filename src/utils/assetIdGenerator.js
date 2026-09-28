const districtCodes = {
  Ahmedabad: 'AHM',
  Gandhinagar: 'GND',
  Rajkot: 'RJK',
  Surat: 'SRT',
  Vadodara: 'VAD',
  Bhavnagar: 'BHV',
  Jamnagar: 'JAM',
  Junagadh: 'JUN',
  Kutch: 'KTC',
  Mehsana: 'MSH'
};

const getDistrictCode = (district) => {
  if (!district) return 'GUJ';
  const clean = district.trim();
  if (districtCodes[clean]) return districtCodes[clean];
  // Fallback: first 3 uppercase chars
  return clean.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase() || 'GUJ';
};

const generateAssetId = async (AssetModel, type, district) => {
  const prefix = type === 'road' ? 'RD' : 'BLD';
  const distCode = getDistrictCode(district);
  const regex = new RegExp(`^${prefix}-${distCode}-\\d{4}$`);

  const count = await AssetModel.countDocuments({ assetId: regex });
  const sequence = String(count + 1).padStart(4, '0');
  return `${prefix}-${distCode}-${sequence}`;
};

module.exports = {
  generateAssetId,
  getDistrictCode
};
