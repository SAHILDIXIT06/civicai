// PMC Complaint Categories Structure
export const PMC_CATEGORIES = {
  'pmc-bhavan': {
    mainLabel: 'PMC Bhavan',
    aiDetectable: false,
    requiresImage: false,
    subCategories: [
      { id: 'other-pmc', label: 'Other' },
      { id: 'water-leakage-building', label: 'Water pipe leakage in building premises' },
      { id: 'compound-gate-repair', label: 'About Compound wall and gate repairing' },
      { id: 'building-leakage', label: 'Leakages in building' },
      { id: 'water-clogging-building', label: 'Water clogging in building premises' },
      { id: 'building-repair', label: 'Repairing works of building' },
      { id: 'structural-audit', label: 'About Structural audit' },
      { id: 'statue-repair', label: 'Repairing works related to statues' }
    ]
  },
  'birth-death': {
    mainLabel: 'Birth And Death',
    aiDetectable: false,
    requiresImage: false,
    subCategories: [
      { id: 'certificate-not-issued', label: 'Birth/Death Certificate not issued' },
      { id: 'certificate-correction', label: 'Correction in Birth/Death Certificate' },
      { id: 'other-birth-death', label: 'Others (Birth-Death)' }
    ]
  },
  'building-permission': {
    mainLabel: 'Building Permission',
    aiDetectable: true, // Can detect unauthorized construction from images
    requiresImage: true,
    subCategories: [
      { id: 'flats-number', label: 'Number of flats in a building' },
      { id: 'certified-copy', label: 'Applied for certified copy but no response' },
      { id: 'unauthorized-construction', label: 'Unauthorised construction/development' },
      { id: 'dp-plan-demand', label: 'DP plan Demand' },
      { id: 'unauthorized-alteration', label: 'Unauthorised alteration/renovation of building' },
      { id: 'regularisation', label: 'Regularisation of plots/constructions' },
      { id: 'plan-not-sanctioned', label: 'Plan submitted but not sanctioned' },
      { id: 'flat-addition', label: 'Flat addition and alteration' },
      { id: 'other-building', label: 'Other (Building Permission)' }
    ]
  },
  'city-development': {
    mainLabel: 'City Development Plan',
    aiDetectable: false,
    requiresImage: false,
    subCategories: [
      { id: 'dp-ongoing', label: 'Ongoing DP process' },
      { id: 'dp-delay', label: 'Delay in plan receiving' },
      { id: 'dp-reservation', label: 'Complaint against DP Reservation' },
      { id: 'dp-road', label: 'Complaint against DP Road' },
      { id: 'environmental-damage', label: 'Environmental damage' },
      { id: 'other-development', label: 'Other (Development Planning)' }
    ]
  },
  'communicable-disease': {
    mainLabel: 'Communicable Disease',
    aiDetectable: false,
    requiresImage: false,
    subCategories: [
      { id: 'swine-flu-dengue', label: 'Diseases like Swine Flu, Dengue, Chikungunya etc' },
      { id: 'other-disease', label: 'Others (Communicable Disease)' }
    ]
  },
  'drainage': {
    mainLabel: 'Drainage',
    aiDetectable: true, // Choked drains, manholes visible in images
    requiresImage: true,
    subCategories: [
      { id: 'manhole-missing', label: 'Replacement of missing/damaged manholes/inspection' },
      { id: 'drainage-leakage', label: 'Stopping leakage of drainage water in Nalla/River' },
      { id: 'choked-drain', label: 'Cleaning/Overflowing choked drains or manholes' },
      { id: 'other-drainage', label: 'Others (DRN)' },
      { id: 'storm-water-chamber', label: 'Providing/repairing of storm water chamber and cover' },
      { id: 'cleaning-chamber', label: 'Cleaning of storm water chamber and nalla' },
      { id: 'pipe-repair', label: 'Repairs of pipe sewers/main sewers' },
      { id: 'manhole-raising', label: 'Raising of manhole (except in monsoon)' },
      { id: 'chamber-overflow', label: 'Stopping chamber overflow (HO)' },
      { id: 'sewage-treatment', label: 'Problem regarding sewage treatment plant (HO)' },
      { id: 'jica-project', label: 'Others (JICA Project) (HO)' },
      { id: 'septic-cleaning', label: 'Septic Tank Cleaning' }
    ]
  },
  'encroachment': {
    mainLabel: 'Encroachments on public premises/roads',
    aiDetectable: true, // Visible hawkers, stalls in images
    requiresImage: true,
    subCategories: [
      { id: 'illegal-hawkers', label: 'Removal of illegal hawkers/stall/hut/workshop/garage structure on footpath/roads' },
      { id: 'religious-structure', label: 'Illegal religious structures on road/footpath' },
      { id: 'shopkeeper-material', label: "Shopkeeper's material on road/footpath" },
      { id: 'illegal-pandal', label: 'Illegal pandals/arches etc. on road/footpath' },
      { id: 'showroom-vehicles', label: 'Vehicles of showroom on road/footpath' },
      { id: 'other-encroachment', label: 'Others (Encroachment W.O.)' },
      { id: 'encroachment-policy', label: 'Policy decisions regarding Encroachment department' },
      { id: 'encroachment-ho', label: 'Other (Encroachment H.O.)' }
    ]
  },
  'mosquito': {
    mainLabel: 'Fogging/Mosquito nuisance/Dengue malaria disease',
    aiDetectable: false,
    requiresImage: false,
    subCategories: [
      { id: 'mosquito-fogging', label: 'Mosquito nuisance/Fogging' },
      { id: 'dengue-case', label: 'Dengue case etc.' },
      { id: 'hyacinth-river', label: 'Hyacinth at river' },
      { id: 'water-storage', label: 'Unauthorised/Uncovered water storage tanks' }
    ]
  },
  'garbage-depot': {
    mainLabel: 'Garbage Depot Complaint',
    aiDetectable: false, // Smell cannot be detected
    requiresImage: false,
    subCategories: [
      { id: 'garbage-burning', label: 'Burning Of Garbage' },
      { id: 'garbage-smell', label: 'Odour (Foul smell) from Garbage Depot' }
    ]
  },
  'garden-civil': {
    mainLabel: 'Garden Civil maintenance work',
    aiDetectable: true,
    requiresImage: true,
    subCategories: [
      { id: 'playing-equipment', label: 'Repairing of playing equipments in garden' },
      { id: 'jogging-track', label: 'Repairing of Jogging Track in garden' },
      { id: 'garden-civil-work', label: 'Repairing of civil work in Garden' },
      { id: 'other-garden-civil', label: 'Others (Garden-Civil)' }
    ]
  },
  'garden-maintenance': {
    mainLabel: 'Garden Cleaning & maintenance',
    aiDetectable: true,
    requiresImage: true,
    subCategories: [
      { id: 'other-garden-ho', label: 'Others (Garden) (HO)' },
      { id: 'planting-trees', label: 'Planting of trees besides divider/footpath (HO)' },
      { id: 'garden-cleaning', label: 'Cleaning of Garden (HO)' },
      { id: 'garden-horticulture', label: 'Maintenance of Garden (Horticulture Related) (HO)' }
    ]
  },
  'garden-electric': {
    mainLabel: 'Garden Electric maintenance work',
    aiDetectable: true,
    requiresImage: true,
    subCategories: [
      { id: 'garden-lights', label: 'Repairing of Lights/Halogen in Garden' },
      { id: 'other-garden-electric', label: 'Others (Garden-Electrical)' }
    ]
  },
  'information-technology': {
    mainLabel: 'Information Technology',
    aiDetectable: false,
    requiresImage: false,
    subCategories: [
      { id: 'other-it', label: 'Other (I.T.)' },
      { id: 'cfc-issues', label: 'CFC related issues' },
      { id: 'mobile-app', label: 'Mobile App Issue' },
      { id: 'website-issue', label: 'Website/Web Application Related' }
    ]
  },
  'license': {
    mainLabel: 'License (Parwana)',
    aiDetectable: false,
    requiresImage: false,
    subCategories: [
      { id: 'pet-license', label: 'Pet License' },
      { id: 'other-license', label: 'Others License (Parwana)' }
    ]
  },
  'marriage': {
    mainLabel: 'Marriage Registration',
    aiDetectable: false,
    requiresImage: false,
    subCategories: [
      { id: 'certificate-not-received', label: 'Marriage Certificate not received in time' },
      { id: 'marriage-correction', label: 'Correction in Marriage Certificate' },
      { id: 'other-marriage', label: 'Other (Marriage Registration)' }
    ]
  },
  'hospital': {
    mainLabel: 'PMC Hospitals treatment',
    aiDetectable: false,
    requiresImage: false,
    subCategories: [
      { id: 'hospital-treatment', label: 'Related to PMC Hospital, Treatment and Staff' },
      { id: 'other-medical', label: 'Others (Medical Unit)' }
    ]
  },
  'property-tax': {
    mainLabel: 'Property Tax Assessment/Payment',
    aiDetectable: false,
    requiresImage: false,
    subCategories: [
      { id: 'assessment-register', label: 'Receipt of Assessment Register' },
      { id: 'name-correction', label: 'Correction of Name on Property tax bill' },
      { id: 'address-correction', label: 'Address correction' },
      { id: 'other-property-tax', label: 'Other (Property Tax)' },
      { id: 'abhay-yojana', label: 'Abhay Yojana' },
      { id: 'assessment-commencement', label: 'Assessment according to commencement' },
      { id: 'triple-tax', label: 'Triple Tax cancellation' },
      { id: 'residential-commercial', label: 'Assessment from residential to Non residential(commercial)' },
      { id: 'arv-correction', label: 'Correction in ARV due to change in use of property' },
      { id: 'discount-40', label: '40% discount on the residential taxable value' },
      { id: 'self-assessment', label: 'SELF ASSESSMENT' },
      { id: 'commercial-residential', label: 'Assessment from Non residential(commercial) to residential' },
      { id: 'bill-separation', label: 'Separation of Bill' },
      { id: 'outstanding-correction', label: 'Correction in outstanding Property Tax' }
    ]
  },
  'road': {
    mainLabel: 'Road, pavement, divider, pits, repair/new speed breaker/zebra crossing',
    aiDetectable: true, // Potholes, road damage visible
    requiresImage: true,
    subCategories: [
      { id: 'pothole', label: 'Repairing potholes on Road' },
      { id: 'road-resurfacing', label: 'Repair/re-surfacing of roads/footpaths' },
      { id: 'stop-line', label: 'Stop line at Signal before Zebra Crossing' },
      { id: 'speed-breaker', label: 'Making/Repairing/Removal Speedbreaker' },
      { id: 'parking-line', label: 'Marking of Parking Line' },
      { id: 'pothole-manhole', label: 'Repairing pothole around manhole' },
      { id: 'zebra-crossing', label: 'About New/Old Zebra Crossing' },
      { id: 'debris-lifting', label: 'Lifting of debris on road and footpath' },
      { id: 'footpath-painting', label: 'Painting of Footpath/Divider/Beautification of Chowk etc' },
      { id: 'water-logging', label: 'Clearing Water Logging on Road' },
      { id: 'other-road', label: 'Others road' }
    ]
  },
  'garbage-sweeping': {
    mainLabel: 'Road Sweeping/Toilet Cleaning/Garbage disposal',
    aiDetectable: true, // Garbage visible
    requiresImage: true,
    subCategories: [
      { id: 'road-sweeping', label: 'Sweeping/cleaning the road' },
      { id: 'debris-removal', label: 'Removal of Debris' },
      { id: 'garbage-bin-overflow', label: 'Garbage bin overflowing' },
      { id: 'garbage-dump', label: 'Huge littering in open plot/Garbage Dump' },
      { id: 'toilet-blockage', label: 'Public toilet(s) blockage' },
      { id: 'toilet-electricity', label: 'No electricity in public toilet(s)' },
      { id: 'garbage-not-lifted', label: 'Garbage not lifted from co-authorized collection point/House gully' },
      { id: 'garbage-vehicle', label: 'Garbage vehicle not arrived' },
      { id: 'garbage-lorry', label: 'Garbage lorry not covered' },
      { id: 'dustbin-replace', label: 'Providing/Removing/Replacing dustbins' },
      { id: 'dead-animal-removal', label: 'Removal of dead animals' },
      { id: 'psc-cleaning', label: 'Cleaning of P.S.C block/channels' },
      { id: 'toilet-attendant', label: 'No attendant at public toilets' },
      { id: 'ragpicker', label: 'Ragpicker not attending' },
      { id: 'tree-cutting-lift', label: 'Lifting of tree cutting' },
      { id: 'toilet-cleaning', label: 'Public toilet(s) cleaning' },
      { id: 'dustbin-cleaning', label: 'Dustbins not cleaned' },
      { id: 'toilet-water', label: 'No water supply in public toilet(s)' },
      { id: 'garbage-burning-plastic', label: 'Burning of Garbage/Plastic waste' },
      { id: 'plastic-bag-usage', label: 'Usage of Plastic bag by shopkeepers' },
      { id: 'other-swm', label: 'Others (SWM)' }
    ]
  },
  'stray-animals': {
    mainLabel: 'Stray Animals',
    aiDetectable: true,
    requiresImage: true,
    subCategories: [
      { id: 'dog-nuisance', label: 'Dog Nuisance' },
      { id: 'pig-nuisance', label: 'Pig Nuisance' },
      { id: 'other-animal-nuisance', label: 'Other Animals Nuisance' }
    ]
  },
  'stray-dogs': {
    mainLabel: 'Stray Dogs',
    aiDetectable: true,
    requiresImage: true,
    subCategories: [
      { id: 'unsterilised-dogs', label: 'Stray Dogs - Unsterilised Dogs' },
      { id: 'injured-dogs', label: 'Treatment for Injured/Sick Dogs' },
      { id: 'rabies-dogs', label: 'Violent/Suspected Rabies dogs' },
      { id: 'other-stray-dogs', label: 'other (Stray Dogs)' }
    ]
  },
  'street-lights': {
    mainLabel: 'Street Lights',
    aiDetectable: true, // Damaged poles visible
    requiresImage: true,
    subCategories: [
      { id: 'electrocution-prevention', label: 'Preventing electrocution/shock' },
      { id: 'pole-removal', label: 'Removing street light pole (pole obstructing road)' },
      { id: 'pole-repair', label: 'Repairing street light pole (damaged/fallen)' },
      { id: 'light-functional', label: 'Making street light functional' },
      { id: 'new-street-light', label: 'A new street light (new demand)' },
      { id: 'electric-box-removal', label: 'Removal of open electric box (silver color) on street light pole' },
      { id: 'toilet-motor', label: 'Public Toilets water motor not working' },
      { id: 'light-shutdown', label: 'Shut down street light' },
      { id: 'other-electric', label: 'other (ELECTRICAL)' }
    ]
  },
  'tree-authority': {
    mainLabel: 'Tree Authority',
    aiDetectable: true, // Fallen trees visible
    requiresImage: true,
    subCategories: [
      { id: 'branch-trimming-roadside', label: 'Trimming of branches in Roadside trees' },
      { id: 'branch-trimming-public', label: 'Trimming of branches in government/public place/road' },
      { id: 'fallen-tree', label: 'Fallen tree on road' },
      { id: 'tree-cutting', label: 'Branch of tree/complete tree cutting' },
      { id: 'trimming-permission', label: 'Permission to Trim Branches in private Society/Land' },
      { id: 'illegal-cutting', label: 'Illegal Cutting of tree' },
      { id: 'other-tree', label: 'Other (Tree Authority)' }
    ]
  },
  'unauthorized-ads': {
    mainLabel: 'Unauthorized hoardings banners/advertisements',
    aiDetectable: true,
    requiresImage: true,
    subCategories: [
      { id: 'unauthorized-hoardings', label: 'Unauthorized hoardings banners/advertisements on roads/footpath/buildings/directions panels' }
    ]
  },
  'slaughterhouse': {
    mainLabel: 'Unauthorized slaughterhouse/crude meat',
    aiDetectable: true,
    requiresImage: true,
    subCategories: [
      { id: 'illegal-slaughter', label: 'Illegal Slaughter House' },
      { id: 'meat-hygiene', label: 'Hygiene of meat' },
      { id: 'other-khatik', label: 'Others (Khatik Vibhag)' }
    ]
  },
  'water-supply': {
    mainLabel: 'Water Supply',
    aiDetectable: true, // Water leakage visible
    requiresImage: true,
    subCategories: [
      { id: 'water-wastage', label: 'Water Flowing/wastage' },
      { id: 'water-meter', label: 'Removal/Installation of new water meters' },
      { id: 'low-pressure-area', label: 'Low pressure to entire area' },
      { id: 'no-water', label: 'NO water Supply' },
      { id: 'low-pressure-individual', label: 'Low water pressure to Individual' },
      { id: 'pipeline-leakage', label: 'Pipeline/Valve Leakage of PMC line' },
      { id: 'contaminated-water', label: 'Contamination/Turbid Water Problem' },
      { id: 'water-misuse', label: 'Water misuse (washing Center/Spreading)' },
      { id: 'water-theft', label: 'Unauthorised tapping of water connection/Water Theft' },
      { id: 'unauthorized-use', label: 'Unauthorised use of water from Residential to Commercial area' },
      { id: 'meter-bill-correction', label: 'Correction in water meter bill (Name/Address/Amount etc)' },
      { id: 'water-meter-not-working', label: 'Water meter not working' },
      { id: 'water-timetable', label: 'No water as per time table' },
      { id: 'motor-pump', label: 'Motor/Pump on water line of pmc' },
      { id: 'toilet-tank-leakage', label: 'Leakage of public toilet water tank' },
      { id: 'other-water', label: 'Others (Water Supply)' }
    ]
  }
};

// AI Category Mapping - Maps AI-detectable visual issues to PMC categories
export const AI_TO_PMC_MAPPING = {
  'pothole': {
    mainCategory: 'road',
    subCategory: 'pothole',
    confidence: 0.9
  },
  'garbage': {
    mainCategory: 'garbage-sweeping',
    subCategory: 'garbage-dump',
    confidence: 0.85
  },
  'puddle': {
    mainCategory: 'road',
    subCategory: 'water-logging',
    confidence: 0.8
  },
  'broken-streetlight': {
    mainCategory: 'street-lights',
    subCategory: 'pole-repair',
    confidence: 0.85
  },
  'fallen-tree': {
    mainCategory: 'tree-authority',
    subCategory: 'fallen-tree',
    confidence: 0.95
  },
  'dead-animal': {
    mainCategory: 'garbage-sweeping',
    subCategory: 'dead-animal-removal',
    confidence: 0.9
  },
  'choked-drain': {
    mainCategory: 'drainage',
    subCategory: 'choked-drain',
    confidence: 0.8
  },
  'unauthorized-construction': {
    mainCategory: 'building-permission',
    subCategory: 'unauthorized-construction',
    confidence: 0.75
  },
  'encroachment': {
    mainCategory: 'encroachment',
    subCategory: 'illegal-hawkers',
    confidence: 0.7
  }
};

// Get all main categories for dropdown
export const getMainCategories = () => {
  return Object.entries(PMC_CATEGORIES).map(([id, data]) => ({
    id,
    label: data.mainLabel,
    aiDetectable: data.aiDetectable,
    requiresImage: data.requiresImage
  }));
};

// Get sub-categories for a main category
export const getSubCategories = (mainCategoryId) => {
  const category = PMC_CATEGORIES[mainCategoryId];
  return category ? category.subCategories : [];
};

// Map AI suggestion to PMC categories
export const mapAIToPMC = (aiCategoryId) => {
  return AI_TO_PMC_MAPPING[aiCategoryId] || null;
};