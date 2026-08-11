/* BT42.195 km Race 2026 — Control Room data (from Project Planner) */

window.BT42_DATA = {
  raceDate: '2026-09-26T06:30:00+02:00',
  eventName: 'BT42.195 km Race 2026',
  chair: 'Chifundo Tenthani',

  keyDates: [
    { label: 'First OC Meeting', date: '2026-08-13', status: 'upcoming' },
    { label: 'Registration Opens', date: '2026-08-18', status: 'upcoming' },
    { label: 'Sponsorship Soft Deadline', date: '2026-09-05', status: 'upcoming' },
    { label: 'Course Marking', date: '2026-09-15', status: 'upcoming' },
    { label: 'Packet Pickup / Expo', date: '2026-09-24', status: 'upcoming' },
    { label: 'RACE DAY', date: '2026-09-26', status: 'race' },
    { label: 'Post-Race Debrief', date: '2026-10-02', status: 'upcoming' }
  ],

  meetings: [
    {
      id: 1, date: '2026-08-13', time: '14:00–16:00', type: 'In-person / Hybrid',
      focus: 'Kick-off & Structure',
      agenda: [
        'Formal confirmation of Chair & OC roles',
        'Review of previous edition learnings',
        'Draft budget & prize structure',
        'Route & date confirmation',
        'Sponsorship strategy & target list',
        'Registration platform decision',
        'Immediate action items & owners'
      ],
      attendees: 'Chair, MNCS reps, Technical Lead, Marketing, Finance, Medical lead'
    },
    {
      id: 2, date: '2026-08-20', time: '14:00–15:30', type: 'Virtual or Hybrid',
      focus: 'Registration & Marketing Launch',
      agenda: [
        'Registration system live status',
        'Marketing calendar & first campaign assets',
        'Sponsor outreach progress report',
        'Volunteer recruitment plan',
        'Medical & safety preliminary plan',
        'App / website first version review'
      ],
      attendees: 'Full OC + digital/tech lead'
    },
    {
      id: 3, date: '2026-08-27', time: '14:00–16:00', type: 'In-person',
      focus: 'Sponsorship Deep Dive',
      agenda: [
        'Sponsor pipeline & signed letters of intent',
        'Benefits packages finalisation',
        'Prize money confirmation vs budget',
        'Course & logistics detailed plan',
        'Timing system & chip supplier',
        'Risk register review'
      ],
      attendees: 'Chair, Finance, Marketing, Technical, MNCS'
    },
    {
      id: 4, date: '2026-09-03', time: '14:00–15:30', type: 'Hybrid',
      focus: 'Operations Mid-Point',
      agenda: [
        'Registration numbers & marketing performance',
        'Final course map & police/traffic plan',
        'Medical deployment plan',
        'Water stations & logistics',
        'Bibs, medals, T-shirts production status',
        'Packet pickup plan'
      ],
      attendees: 'Full OC'
    },
    {
      id: 5, date: '2026-09-10', time: '14:00–16:00', type: 'In-person',
      focus: 'Race Week Readiness',
      agenda: [
        'Final participant projections',
        'Volunteer roster & briefing schedule',
        'Communication plan (SMS/App/Radio)',
        'Contingency scenarios (weather, medical)',
        'Media & live coverage plan',
        'Sponsor activation on race day'
      ],
      attendees: 'Full OC + key suppliers'
    },
    {
      id: 6, date: '2026-09-17', time: '14:00–15:30', type: 'Hybrid',
      focus: 'Final Logistics Lock',
      agenda: [
        'Course marking schedule',
        'Equipment & water delivery timeline',
        'Security & traffic final sign-off',
        'Elite athlete support (if any)',
        'Packet pickup logistics',
        'App push notifications test'
      ],
      attendees: 'Technical, Logistics, Medical, Chair'
    },
    {
      id: 7, date: '2026-09-24', time: '10:00–12:00', type: 'On-site / Stadium',
      focus: 'Pre-Race Briefing',
      agenda: [
        'Final numbers & start lists',
        'Marshal & volunteer final briefing',
        'Medical team briefing',
        'Media & results process',
        'Race-day roles confirmation',
        'Emergency contacts & radios'
      ],
      attendees: 'All key operational leads + lead volunteers'
    },
    {
      id: 8, date: '2026-10-02', time: '14:00–16:00', type: 'In-person / Hybrid',
      focus: 'Post-Race Debrief',
      agenda: [
        'What went well / what to improve',
        'Financial reconciliation',
        'Participant & sponsor feedback summary',
        'Results verification & records',
        'Recommendations for 2027',
        'Thank-you communications'
      ],
      attendees: 'Full OC + MNCS'
    }
  ],

  checklist: [
    { id: 'G01', cat: 'Governance', task: 'Confirm formal Chair appointment letter from MNCS', owner: 'Chair / MNCS', due: '13 Aug', status: 'todo' },
    { id: 'G02', cat: 'Governance', task: 'Finalise OC organogram & role descriptions', owner: 'Chair', due: '15 Aug', status: 'todo' },
    { id: 'G03', cat: 'Governance', task: 'Open or confirm event bank account / payment handling', owner: 'Finance', due: '20 Aug', status: 'todo' },
    { id: 'G04', cat: 'Governance', task: 'Insurance (public liability / event) confirmed', owner: 'Finance / MNCS', due: '05 Sep', status: 'todo' },
    { id: 'R01', cat: 'Registration', task: 'Decide platform (web + Netlify Forms / Sheet)', owner: 'Tech / Chair', due: '15 Aug', status: 'done' },
    { id: 'R02', cat: 'Registration', task: 'Registration form live (online)', owner: 'Tech', due: '18 Aug', status: 'todo' },
    { id: 'R03', cat: 'Registration', task: 'Mobile money payment instructions published', owner: 'Tech / Finance', due: '18 Aug', status: 'todo' },
    { id: 'R04', cat: 'Registration', task: 'Early-bird pricing & cut-off dates published', owner: 'Marketing', due: '18 Aug', status: 'todo' },
    { id: 'R05', cat: 'Registration', task: 'Daily registration dashboard shared with OC', owner: 'Tech', due: 'Ongoing', status: 'todo' },
    { id: 'S01', cat: 'Sponsorship', task: 'Finalise sponsorship packages (Platinum / Gold / Silver / In-kind)', owner: 'Marketing', due: '15 Aug', status: 'todo' },
    { id: 'S02', cat: 'Sponsorship', task: 'Priority target list & outreach sequence agreed', owner: 'Marketing / Chair', due: '15 Aug', status: 'todo' },
    { id: 'S03', cat: 'Sponsorship', task: 'Approach Premier Bet for renewal / Platinum', owner: 'Chair / Marketing', due: '18 Aug', status: 'todo' },
    { id: 'S04', cat: 'Sponsorship', task: 'Approach Airtel, TNM, NBM, Standard Bank, FCB, NBS', owner: 'Marketing', due: '20 Aug', status: 'todo' },
    { id: 'S05', cat: 'Sponsorship', task: 'Approach beverage / water partners (Quench, Kasupe)', owner: 'Marketing', due: '22 Aug', status: 'todo' },
    { id: 'S06', cat: 'Sponsorship', task: 'Signed agreements or LOIs for core sponsors', owner: 'Marketing', due: '05 Sep', status: 'todo' },
    { id: 'S07', cat: 'Sponsorship', task: 'Sponsor branding assets collected & approved', owner: 'Marketing', due: '15 Sep', status: 'todo' },
    { id: 'T01', cat: 'Course & Tech', task: 'Confirm exact route with MNCS / city authorities', owner: 'Technical', due: '20 Aug', status: 'todo' },
    { id: 'T02', cat: 'Course & Tech', task: 'Police & traffic management approval obtained', owner: 'Technical / Chair', due: '05 Sep', status: 'todo' },
    { id: 'T03', cat: 'Course & Tech', task: 'Timing system / chip supplier contracted', owner: 'Technical', due: '25 Aug', status: 'todo' },
    { id: 'T04', cat: 'Course & Tech', task: 'Course measurement / certification (if required)', owner: 'Technical', due: '10 Sep', status: 'todo' },
    { id: 'T05', cat: 'Course & Tech', task: 'Course marking plan & materials ready', owner: 'Technical', due: '18 Sep', status: 'todo' },
    { id: 'T06', cat: 'Course & Tech', task: 'Water / aid station locations finalised (~every 5 km)', owner: 'Logistics', due: '10 Sep', status: 'todo' },
    { id: 'M01', cat: 'Medical', task: 'Lead medical officer / organisation confirmed', owner: 'Medical Lead', due: '25 Aug', status: 'todo' },
    { id: 'M02', cat: 'Medical', task: 'Ambulance coverage & first-aid posts plan', owner: 'Medical Lead', due: '05 Sep', status: 'todo' },
    { id: 'M03', cat: 'Medical', task: 'Medical brief for marshals & volunteers prepared', owner: 'Medical Lead', due: '20 Sep', status: 'todo' },
    { id: 'M04', cat: 'Medical', task: 'Emergency contact & evacuation protocol documented', owner: 'Medical / Chair', due: '20 Sep', status: 'todo' },
    { id: 'L01', cat: 'Logistics', task: 'Medals design & order placed', owner: 'Logistics', due: '25 Aug', status: 'todo' },
    { id: 'L02', cat: 'Logistics', task: 'Race T-shirts / bibs ordered', owner: 'Logistics', due: '01 Sep', status: 'todo' },
    { id: 'L03', cat: 'Logistics', task: 'Water, cups, electrolytes, ice ordered', owner: 'Logistics', due: '10 Sep', status: 'todo' },
    { id: 'L04', cat: 'Logistics', task: 'Finish-line infrastructure confirmed', owner: 'Logistics', due: '15 Sep', status: 'todo' },
    { id: 'L05', cat: 'Logistics', task: 'Volunteer recruitment drive launched', owner: 'Volunteer Coord', due: '20 Aug', status: 'todo' },
    { id: 'L06', cat: 'Logistics', task: 'Volunteer briefing materials & roster complete', owner: 'Volunteer Coord', due: '22 Sep', status: 'todo' },
    { id: 'C01', cat: 'Marketing', task: 'Event theme / tagline finalised', owner: 'Marketing', due: '15 Aug', status: 'todo' },
    { id: 'C02', cat: 'Marketing', task: 'Social media accounts / pages ready & content calendar', owner: 'Marketing', due: '18 Aug', status: 'todo' },
    { id: 'C03', cat: 'Marketing', task: 'Press release / media advisory for registration launch', owner: 'Marketing', due: '18 Aug', status: 'todo' },
    { id: 'C04', cat: 'Marketing', task: 'Radio & print partnerships secured', owner: 'Marketing', due: '01 Sep', status: 'todo' },
    { id: 'C05', cat: 'Marketing', task: 'Athlete / influencer ambassador outreach', owner: 'Marketing', due: '25 Aug', status: 'todo' },
    { id: 'C06', cat: 'Marketing', task: 'Race-week media plan & live coverage', owner: 'Marketing', due: '18 Sep', status: 'todo' },
    { id: 'D01', cat: 'Race Day', task: 'Detailed race-day run sheet (minute-by-minute)', owner: 'Chair / Technical', due: '20 Sep', status: 'todo' },
    { id: 'D02', cat: 'Race Day', task: 'Packet pickup / expo logistics locked', owner: 'Logistics', due: '20 Sep', status: 'todo' },
    { id: 'D03', cat: 'Race Day', task: 'Results process & verification team ready', owner: 'Technical', due: '22 Sep', status: 'todo' },
    { id: 'D04', cat: 'Race Day', task: 'Prize-giving script & podium protocol', owner: 'Chair / Marketing', due: '22 Sep', status: 'todo' },
    { id: 'D05', cat: 'Post-Race', task: 'Participant feedback survey distributed', owner: 'Marketing', due: '27 Sep', status: 'todo' },
    { id: 'D06', cat: 'Post-Race', task: 'Sponsor report & thank-you letters', owner: 'Marketing / Chair', due: '05 Oct', status: 'todo' },
    { id: 'D07', cat: 'Post-Race', task: 'Financial reconciliation complete', owner: 'Finance', due: '10 Oct', status: 'todo' },
    { id: 'D08', cat: 'Post-Race', task: 'Full debrief report for MNCS & 2027 handover', owner: 'Chair', due: '15 Oct', status: 'todo' }
  ],

  sponsors: [
    { priority: 1, org: 'Premier Bet Malawi', category: 'Betting / Gaming', tier: 'Platinum', status: 'To Contact', value: 'K15m+ (prev)', notes: 'Strong previous partner — start here' },
    { priority: 1, org: 'Airtel Malawi', category: 'Telecom / Mobile Money', tier: 'Platinum / Gold', status: 'To Contact', value: 'Cash + data/SMS + payment', notes: 'High strategic fit for app & payments' },
    { priority: 1, org: 'TNM', category: 'Telecom / Mobile Money', tier: 'Gold / Platinum', status: 'To Contact', value: 'Cash + Mpamba + airtime', notes: 'Long sports history' },
    { priority: 2, org: 'National Bank of Malawi (NBM)', category: 'Banking', tier: 'Gold', status: 'To Contact', value: 'Cash package', notes: 'Large sports packages recently' },
    { priority: 2, org: 'Standard Bank Malawi', category: 'Banking', tier: 'Gold', status: 'To Contact', value: 'Cash / in-kind', notes: 'Previous race involvement history' },
    { priority: 2, org: 'First Capital Bank (FCB)', category: 'Banking', tier: 'Gold / Silver', status: 'To Contact', value: 'Cash', notes: 'Active football sponsor' },
    { priority: 2, org: 'NBS Bank', category: 'Banking', tier: 'Silver / Gold', status: 'To Contact', value: 'Cash', notes: 'Charity Shield & league experience' },
    { priority: 3, org: 'Carlsberg Malawi / Quench', category: 'Beverage', tier: 'Gold (hydration)', status: 'To Contact', value: 'Product + cash', notes: 'Natural race partner' },
    { priority: 3, org: 'Island Beverages (Kasupe)', category: 'Beverage / Water', tier: 'Silver / In-kind', status: 'To Contact', value: 'Water supply', notes: 'Golf & event experience' },
    { priority: 3, org: 'Old Mutual Malawi', category: 'Insurance / FS', tier: 'Silver', status: 'To Contact', value: 'Cash / athlete support', notes: 'Past athlete sponsorship' },
    { priority: 4, org: 'Media houses (Times, Nation, MBC)', category: 'Media', tier: 'In-kind / Partnership', status: 'To Contact', value: 'Coverage', notes: 'Essential for reach' }
  ],

  budget: {
    expenditure: [
      { cat: 'Prizes', item: 'Marathon overall + top 10 + veterans', est: 8000000 },
      { cat: 'Prizes', item: '10 km & 5 km prizes', est: 2500000 },
      { cat: 'Medals & Awards', item: 'Finisher medals + trophies', est: 3500000 },
      { cat: 'Apparel', item: 'Race T-shirts / bibs', est: 4500000 },
      { cat: 'Timing', item: 'Chip timing system & results', est: 2500000 },
      { cat: 'Medical', item: 'Ambulances, medics, supplies', est: 3000000 },
      { cat: 'Hydration & Logistics', item: 'Water, cups, stations, transport', est: 4000000 },
      { cat: 'Course & Security', item: 'Marking, barriers, police support', est: 2000000 },
      { cat: 'Marketing & Media', item: 'Design, ads, radio, content', est: 2500000 },
      { cat: 'Digital (App/Web)', item: 'Development / hosting / SMS', est: 2500000 },
      { cat: 'Operations', item: 'Volunteers, food, radios, misc', est: 2000000 },
      { cat: 'Contingency (10–15%)', item: 'Unforeseen', est: 3500000 }
    ],
    income: [
      { item: 'Sponsorship (cash + valued in-kind)', target: 30000000 },
      { item: 'Registration fees (net)', target: 8000000 },
      { item: 'Other (grants, merchandise, etc.)', target: 2000000 }
    ]
  },

  runsheet: [
    { time: '04:30', activity: 'Core team arrive, set-up begins', location: 'Kamuzu Stadium', lead: 'Logistics + Technical' },
    { time: '05:00', activity: 'Water stations & course marking teams deploy', location: 'Full course', lead: 'Technical / Logistics' },
    { time: '05:30', activity: 'Medical team & ambulances in position', location: 'Key points + stadium', lead: 'Medical Lead' },
    { time: '05:45', activity: 'Volunteer marshals briefing', location: 'Stadium', lead: 'Volunteer Coord' },
    { time: '06:00', activity: 'Packet pickup / late registration closes', location: 'Stadium registration area', lead: 'Registration Lead' },
    { time: '06:15', activity: 'Elite / seeded athletes call room', location: 'Near start', lead: 'Technical' },
    { time: '06:30', activity: 'Marathon start (target)', location: 'Start line', lead: 'Starter / Technical' },
    { time: '06:45–07:00', activity: '10 km start (staggered)', location: 'Start line', lead: 'Starter' },
    { time: '07:15–07:30', activity: '5 km Fun Run start', location: 'Start line', lead: 'Starter' },
    { time: '07:30 onwards', activity: 'Live updates, lead vehicle, media', location: 'Course', lead: 'Marketing / Technical' },
    { time: '~08:45–09:30', activity: 'First marathon finishers expected', location: 'Finish line', lead: 'Timing + Announcer' },
    { time: 'Ongoing', activity: '5 km & 10 km finishers, medals, recovery', location: 'Finish area', lead: 'Logistics + Medical' },
    { time: '10:30–11:30', activity: 'Prize-giving ceremony', location: 'Stadium podium / stage', lead: 'Chair + MC' },
    { time: '12:00', activity: 'Course clear & equipment recovery begins', location: 'Full course', lead: 'Logistics' },
    { time: '13:00+', activity: 'Core team debrief hot-wash (quick)', location: 'Stadium', lead: 'Chair' }
  ],

  roles: [
    { role: 'Chair of Organising Committee', name: 'Chifundo Tenthani', responsibilities: 'Overall leadership, MNCS liaison, sponsor high-level, final decisions' },
    { role: 'Technical / Course Lead', name: '', responsibilities: 'Route, timing, course marking, results' },
    { role: 'Medical Lead', name: '', responsibilities: 'Ambulances, first aid, medical protocol' },
    { role: 'Logistics & Supplies', name: '', responsibilities: 'Water, medals, T-shirts, transport, equipment' },
    { role: 'Marketing & Communications', name: '', responsibilities: 'Brand, social, media, content, app messaging' },
    { role: 'Sponsorship Lead', name: '', responsibilities: 'Packages, outreach, contracts, activation' },
    { role: 'Finance & Registration Admin', name: '', responsibilities: 'Budget, payments, registration data, reconciliation' },
    { role: 'Volunteer Coordinator', name: '', responsibilities: 'Recruitment, briefing, race-day deployment' },
    { role: 'MNCS Link / Official', name: '', responsibilities: 'Institutional support, approvals, continuity' },
    { role: 'Digital / App Lead', name: '', responsibilities: 'Website, app, live updates, results publishing' }
  ],

  successMetrics: [
    { metric: 'Registrations', target: '≥ 450 total (Marathon ≥ 120)' },
    { metric: 'Sponsorship Cash', target: '≥ MK 25–40 million (or equivalent value)' },
    { metric: 'Safety Incidents', target: 'Zero major medical emergencies' },
    { metric: 'Participant Satisfaction', target: '≥ 85% positive feedback' },
    { metric: 'Media Reach', target: 'National TV/radio + strong social coverage' },
    { metric: 'App / Web Usage', target: '≥ 60% of registrants use digital platform' }
  ]
};
