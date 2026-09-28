const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const User = require('./models/User');
const Asset = require('./models/Asset');
const TimelineEvent = require('./models/TimelineEvent');
const Inspection = require('./models/Inspection');
const Task = require('./models/Task');
const Complaint = require('./models/Complaint');

const seedData = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ais_rnb_gujarat';
    await mongoose.connect(mongoUri);
    console.log('[Seed] Connected to MongoDB at:', mongoUri);

    // Clear existing data
    await User.deleteMany({});
    await Asset.deleteMany({});
    await TimelineEvent.deleteMany({});
    await Inspection.deleteMany({});
    await Task.deleteMany({});
    await Complaint.deleteMany({});
    console.log('[Seed] Cleared existing collections.');

    // 1. Create Users (passwords will be hashed automatically by User pre-save hook)
    const admin = await User.create({
      name: 'Shri Vikram Mehta',
      email: 'admin@rnb.gujarat.gov.in',
      passwordHash: 'Admin@123',
      role: 'super_admin',
      phone: '+91 98250 11001'
    });

    const officerAhm = await User.create({
      name: 'Anjali Desai (EE Ahmedabad)',
      email: 'officer.ahm@rnb.gujarat.gov.in',
      passwordHash: 'Officer@123',
      role: 'regional_officer',
      district: 'Ahmedabad',
      phone: '+91 98250 22002'
    });

    const officerGnd = await User.create({
      name: 'Bhupendra Joshi (EE Gandhinagar)',
      email: 'officer.gnd@rnb.gujarat.gov.in',
      passwordHash: 'Officer@123',
      role: 'regional_officer',
      district: 'Gandhinagar',
      phone: '+91 98250 22003'
    });

    const officerRjk = await User.create({
      name: 'Harshvardhan Vala (EE Rajkot)',
      email: 'officer.rjk@rnb.gujarat.gov.in',
      passwordHash: 'Officer@123',
      role: 'regional_officer',
      district: 'Rajkot',
      phone: '+91 98250 22004'
    });

    const engineerPatel = await User.create({
      name: 'Dhaval Patel (AE)',
      email: 'engineer.patel@rnb.gujarat.gov.in',
      passwordHash: 'Engineer@123',
      role: 'field_engineer',
      district: 'Ahmedabad',
      phone: '+91 98250 33001'
    });

    const engineerShah = await User.create({
      name: 'Kavita Shah (AE)',
      email: 'engineer.shah@rnb.gujarat.gov.in',
      passwordHash: 'Engineer@123',
      role: 'field_engineer',
      district: 'Gandhinagar',
      phone: '+91 98250 33002'
    });

    const contractorLt = await User.create({
      name: 'L&T Infrastructure Projects',
      email: 'contact@lntinfrastructure.com',
      passwordHash: 'Contractor@123',
      role: 'organization',
      organizationName: 'Larsen & Toubro Ltd.',
      organizationContact: '+91 79 2658 9000',
      phone: '+91 98250 44001'
    });

    const contractorGhb = await User.create({
      name: 'Gujarat Highway Builders Ltd.',
      email: 'info@gujaratroads.in',
      passwordHash: 'Contractor@123',
      role: 'organization',
      organizationName: 'Gujarat Highway Builders Ltd.',
      organizationContact: '+91 79 2741 8000',
      phone: '+91 98250 44002'
    });

    const citizenRajesh = await User.create({
      name: 'Rajesh Solanki',
      email: 'rajesh.citizen@gmail.com',
      passwordHash: 'Citizen@123',
      role: 'citizen',
      district: 'Ahmedabad',
      phone: '+91 98765 43210'
    });

    const citizenPriya = await User.create({
      name: 'Priya Dave',
      email: 'priya.citizen@gmail.com',
      passwordHash: 'Citizen@123',
      role: 'citizen',
      district: 'Rajkot',
      phone: '+91 98765 43211'
    });

    console.log('[Seed] Created 10 sample users across all 5 roles.');

    // 2. Create Assets
    const assetsData = [
      {
        assetId: 'RD-AHM-0001',
        name: 'Sarkhej-Gandhinagar (SG) Highway Stretch 1',
        type: 'road',
        district: 'Ahmedabad',
        location: 'SG Highway, Thaltej to Pakwan Cross Road',
        coordinates: { lat: 23.0524, lng: 72.5186 },
        attributes: { length_km: 12.5, width_m: 35.0, surfaceType: 'asphalt', lanes: 6 },
        currentStage: 'active',
        assignedOfficer: officerAhm._id,
        assignedEngineers: [engineerPatel._id],
        estimatedCost: 45000000,
        actualCost: 43200000,
        createdBy: admin._id,
        stageHistory: [
          { stage: 'planning', enteredAt: new Date('2024-01-10'), changedBy: admin._id, notes: 'Survey approved' },
          { stage: 'construction', enteredAt: new Date('2024-03-01'), changedBy: admin._id, notes: 'Contractor deployed' },
          { stage: 'active', enteredAt: new Date('2024-11-15'), changedBy: officerAhm._id, notes: 'Stretch completed and commissioned' }
        ]
      },
      {
        assetId: 'RD-AHM-0002',
        name: 'SP Ring Road Bopal Flyover Corridor',
        type: 'road',
        district: 'Ahmedabad',
        location: 'SP Ring Road, South Bopal Junction',
        coordinates: { lat: 23.0338, lng: 72.4634 },
        attributes: { length_km: 4.2, width_m: 24.0, surfaceType: 'concrete', lanes: 4 },
        currentStage: 'maintenance',
        assignedOfficer: officerAhm._id,
        assignedEngineers: [engineerPatel._id],
        estimatedCost: 18000000,
        actualCost: 17500000,
        createdBy: admin._id,
        stageHistory: [
          { stage: 'planning', enteredAt: new Date('2024-02-01'), changedBy: admin._id, notes: 'Flyover widening project' },
          { stage: 'construction', enteredAt: new Date('2024-04-10'), changedBy: admin._id, notes: 'Work begun' },
          { stage: 'active', enteredAt: new Date('2024-12-01'), changedBy: officerAhm._id, notes: 'Open for traffic' },
          { stage: 'maintenance', enteredAt: new Date('2026-02-15'), changedBy: officerAhm._id, notes: 'Expansion joint resurfacing' }
        ]
      },
      {
        assetId: 'BLD-AHM-0001',
        name: 'District Collectorate Complex Ahmedabad',
        type: 'building',
        district: 'Ahmedabad',
        location: 'Near Subhash Bridge, Ashram Road',
        coordinates: { lat: 23.0592, lng: 72.5794 },
        attributes: { area_sqm: 14500, floors: 5, buildingType: 'public', constructionYear: 2018 },
        currentStage: 'active',
        assignedOfficer: officerAhm._id,
        assignedEngineers: [engineerPatel._id],
        estimatedCost: 120000000,
        actualCost: 118000000,
        createdBy: admin._id,
        stageHistory: [
          { stage: 'planning', enteredAt: new Date('2017-01-10'), changedBy: admin._id, notes: 'Architecture plan approved' },
          { stage: 'construction', enteredAt: new Date('2017-05-12'), changedBy: admin._id, notes: 'Civil works started' },
          { stage: 'active', enteredAt: new Date('2018-09-20'), changedBy: officerAhm._id, notes: 'Occupancy certificate issued' }
        ]
      },
      {
        assetId: 'BLD-GND-0001',
        name: 'New Sachivalaya Block 4 (P&D Wing)',
        type: 'building',
        district: 'Gandhinagar',
        location: 'Sector 10, Gandhinagar Capital Complex',
        coordinates: { lat: 23.2156, lng: 72.6369 },
        attributes: { area_sqm: 22000, floors: 7, buildingType: 'office', constructionYear: 2021 },
        currentStage: 'active',
        assignedOfficer: officerGnd._id,
        assignedEngineers: [engineerShah._id],
        estimatedCost: 280000000,
        actualCost: 275000000,
        createdBy: admin._id,
        stageHistory: [
          { stage: 'planning', enteredAt: new Date('2019-03-01'), changedBy: admin._id, notes: 'Initial budget approved' },
          { stage: 'construction', enteredAt: new Date('2019-11-15'), changedBy: admin._id, notes: 'Structural work started' },
          { stage: 'active', enteredAt: new Date('2021-06-30'), changedBy: officerGnd._id, notes: 'Inaugurated' }
        ]
      },
      {
        assetId: 'RD-GND-0001',
        name: 'Gandhinagar-Koba Aerodrome Link Highway',
        type: 'road',
        district: 'Gandhinagar',
        location: 'Between CH-0 Circle and Koba Circle',
        coordinates: { lat: 23.1782, lng: 72.6288 },
        attributes: { length_km: 8.4, width_m: 30.0, surfaceType: 'asphalt', lanes: 6 },
        currentStage: 'construction',
        assignedOfficer: officerGnd._id,
        assignedEngineers: [engineerShah._id],
        estimatedCost: 32000000,
        actualCost: 14000000,
        createdBy: admin._id,
        stageHistory: [
          { stage: 'planning', enteredAt: new Date('2025-05-10'), changedBy: admin._id, notes: 'Detailed Project Report (DPR) cleared' },
          { stage: 'construction', enteredAt: new Date('2025-10-01'), changedBy: admin._id, notes: 'Four-laning expansion underway' }
        ]
      },
      {
        assetId: 'RD-RJK-0001',
        name: 'Kalawad Road Expressway Section 2',
        type: 'road',
        district: 'Rajkot',
        location: 'Kalawad Road, KKV Hall to Crystal Mall',
        coordinates: { lat: 22.2882, lng: 70.7712 },
        attributes: { length_km: 6.8, width_m: 28.0, surfaceType: 'asphalt', lanes: 4 },
        currentStage: 'active',
        assignedOfficer: officerRjk._id,
        assignedEngineers: [],
        estimatedCost: 24000000,
        actualCost: 23800000,
        createdBy: admin._id,
        stageHistory: [
          { stage: 'planning', enteredAt: new Date('2023-08-15'), changedBy: admin._id, notes: 'Plan sanctioned' },
          { stage: 'construction', enteredAt: new Date('2024-01-20'), changedBy: admin._id, notes: 'Work awarded' },
          { stage: 'active', enteredAt: new Date('2024-09-10'), changedBy: officerRjk._id, notes: 'Fully commissioned' }
        ]
      },
      {
        assetId: 'BLD-RJK-0001',
        name: 'Civil Hospital Multi-Specialty Extension',
        type: 'building',
        district: 'Rajkot',
        location: 'Hospital Chowk, Rajkot',
        coordinates: { lat: 22.3072, lng: 70.8022 },
        attributes: { area_sqm: 18000, floors: 6, buildingType: 'healthcare', constructionYear: 2023 },
        currentStage: 'planning',
        assignedOfficer: officerRjk._id,
        assignedEngineers: [],
        estimatedCost: 95000000,
        actualCost: 0,
        createdBy: admin._id,
        stageHistory: [
          { stage: 'planning', enteredAt: new Date('2026-01-05'), changedBy: admin._id, notes: 'Architectural blueprints under review' }
        ]
      }
    ];

    const assets = await Asset.insertMany(assetsData);
    console.log(`[Seed] Created ${assets.length} sample assets.`);

    // 3. Create Timeline Events
    for (const a of assets) {
      await TimelineEvent.create({
        asset: a._id,
        eventType: 'stage_change',
        title: `Asset Initialized in ${a.currentStage.toUpperCase()}`,
        description: `Asset registered in ${a.district} under Roads & Buildings Dept.`,
        fromStage: null,
        toStage: a.currentStage,
        performedBy: admin._id,
        performedByRole: admin.role
      });
    }

    // 4. Create Sample Inspections
    const inspection1 = await Inspection.create({
      asset: assets[0]._id, // SG Highway
      inspector: engineerPatel._id,
      inspectionDate: new Date('2026-03-10'),
      conditionRating: 4,
      conditionNotes: 'Road surface is in good overall condition. Minor shoulder erosion detected near km 4.5.',
      findings: [
        {
          category: 'surface',
          severity: 'low',
          description: 'Minor hair-cracks on service lane asphalt.',
          photos: []
        },
        {
          category: 'drainage',
          severity: 'medium',
          description: 'Rainwater drain grates need desilting before monsoon.',
          photos: []
        }
      ],
      recommendation: 'minor_repair',
      status: 'approved',
      reviewedBy: officerAhm._id,
      reviewedAt: new Date('2026-03-12'),
      reviewNotes: 'Approved. Forwarded for desilting schedule.'
    });

    const inspection2 = await Inspection.create({
      asset: assets[1]._id, // SP Ring Road
      inspector: engineerPatel._id,
      inspectionDate: new Date('2026-03-18'),
      conditionRating: 2,
      conditionNotes: 'Expansion joints damaged causing vehicle jerks. Immediate asphalt patching needed.',
      findings: [
        {
          category: 'structural',
          severity: 'high',
          description: 'Bridge expansion rubber strip worn out.',
          photos: []
        }
      ],
      recommendation: 'major_repair',
      status: 'submitted'
    });

    console.log('[Seed] Created sample inspections.');

    // 5. Create Sample Tasks
    const task1 = await Task.create({
      asset: assets[1]._id, // SP Ring Road
      title: 'Flyover Expansion Joint Repair & Resurfacing',
      description: 'Replace elastomeric expansion joints and apply tack coat with 40mm bitumen overlay.',
      taskType: 'repair',
      assignedTo: contractorGhb._id,
      assignedBy: officerAhm._id,
      priority: 'high',
      startDate: new Date('2026-03-20'),
      dueDate: new Date('2026-04-10'),
      status: 'in_progress',
      estimatedBudget: 850000,
      actualSpent: 320000,
      progressUpdates: [
        {
          description: 'Demolition of broken concrete edges completed. Steel anchor bars inspected.',
          percentComplete: 40,
          photos: [],
          updatedBy: contractorGhb._id,
          updatedAt: new Date('2026-03-24')
        }
      ]
    });

    const task2 = await Task.create({
      asset: assets[4]._id, // Gandhinagar Aerodrome Link
      title: 'Four-laning Earthwork & Sub-base Compaction',
      description: 'Grading of embankment and laying Granular Sub Base (GSB) for 8.4 km stretch.',
      taskType: 'construction',
      assignedTo: contractorLt._id,
      assignedBy: officerGnd._id,
      priority: 'urgent',
      startDate: new Date('2025-10-15'),
      dueDate: new Date('2026-06-30'),
      status: 'in_progress',
      estimatedBudget: 15000000,
      actualSpent: 7500000,
      progressUpdates: [
        {
          description: 'Sub-base compaction tested up to km 5.0 with favorable density results.',
          percentComplete: 55,
          photos: [],
          updatedBy: contractorLt._id,
          updatedAt: new Date('2026-03-15')
        }
      ]
    });

    console.log('[Seed] Created sample contractor tasks.');

    // 6. Create Sample Citizen Complaints
    const complaint1 = await Complaint.create({
      asset: assets[0]._id, // SG Highway
      complainant: citizenRajesh._id,
      title: 'Dangerous deep pothole near Thaltej Underpass exit',
      description: 'There is a severe pothole right where vehicles merge from the slip road onto SG Highway. Two two-wheelers skidded yesterday evening.',
      category: 'pothole',
      specificLocation: 'Northbound lane, 100m past Thaltej underpass exit',
      status: 'work_started',
      priority: 'high',
      linkedInspection: inspection1._id,
      remarks: [
        {
          text: 'Complaint reviewed by AE Dhaval Patel. Quick patch team deployed.',
          by: officerAhm._id,
          at: new Date('2026-03-16')
        }
      ]
    });

    const complaint2 = await Complaint.create({
      asset: assets[1]._id, // SP Ring Road
      complainant: citizenRajesh._id,
      title: 'Severe vibration on Bopal flyover ramp',
      description: 'The expansion joint on the south ramp has broken chunks of concrete exposed, causing tire damage.',
      category: 'road_damage',
      specificLocation: 'Bopal flyover south ramp climb',
      status: 'work_started',
      priority: 'urgent',
      linkedTask: task1._id,
      remarks: [
        {
          text: 'Triage complete. Repair work awarded to Gujarat Highway Builders Ltd.',
          by: officerAhm._id,
          at: new Date('2026-03-21')
        }
      ]
    });

    const complaint3 = await Complaint.create({
      asset: assets[5]._id, // Kalawad Road Rajkot
      complainant: citizenPriya._id,
      title: 'Waterlogging during morning pipeline leakage near KKV hall',
      description: 'A municipal water line leakage has accumulated ankle-deep water, eroding the road edge.',
      category: 'waterlogging',
      specificLocation: 'Kalawad Road opposite KKV hall',
      status: 'registered',
      priority: 'medium'
    });

    console.log('[Seed] Created sample citizen complaints.');

    console.log('=======================================================');
    console.log('✅ SEEDING COMPLETE FOR R&B GUJARAT ASSET INVENTORY');
    console.log('=======================================================');
    console.log('Demo Login Credentials:');
    console.log('  1. Super Admin:      admin@rnb.gujarat.gov.in / Admin@123');
    console.log('  2. Regional Officer: officer.ahm@rnb.gujarat.gov.in / Officer@123 (Ahmedabad)');
    console.log('  3. Field Engineer:   engineer.patel@rnb.gujarat.gov.in / Engineer@123');
    console.log('  4. Organization:     contact@lntinfrastructure.com / Contractor@123');
    console.log('  5. Citizen:          rajesh.citizen@gmail.com / Citizen@123');
    console.log('=======================================================');

    process.exit(0);
  } catch (error) {
    console.error('[Seed Error]:', error);
    process.exit(1);
  }
};

seedData();
