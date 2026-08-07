const postingUsers = [
  {
    key: 'john-target',
    name: 'John Smith',
    email: 'jsmith@globalpharma.com',
    password: 'Twinkle2019',
    headline: 'Cat Lover, Father, Marketer. In that order',
    employer: 'GlobalPharma plc',
    jobTitle: 'Marketing Director',
    showEmail: true,
    avatarVariant: 0
  },
  {
    key: 'elloit',
    name: 'Elloit Alderson',
    email: 'ealderson@realphotography.com',
    password: 'Viewfinder26!',
    headline: 'Building visual stories that make technical work impossible to overlook',
    employer: 'Realphotography',
    jobTitle: 'Vice President',
    showEmail: false,
    avatarVariant: 1
  },
  {
    key: 'sarah',
    name: "Sarah O'Connell",
    email: 'sarah.oconnell@tyrell-corp.example',
    password: 'Replicant26!',
    headline: 'Designing resilient cloud platforms for teams building at scale',
    employer: 'Tyrell Corporation',
    jobTitle: 'Cloud Engineering Lead',
    showEmail: false,
    avatarVariant: 2
  },
  {
    key: 'marcus',
    name: 'Marcus Chen',
    email: 'marcus.chen@weyland-yutani.example',
    password: 'Nostromo26!',
    headline: 'Turning security architecture into practical engineering decisions',
    employer: 'Weyland-Yutani',
    jobTitle: 'Security Architecture Manager',
    showEmail: false,
    avatarVariant: 3
  },
  {
    key: 'priya',
    name: 'Priya Nair',
    email: 'priya.nair@massivedynamic.example',
    password: 'Pattern26!',
    headline: 'Helping organisations turn governed data into useful decisions',
    employer: 'Massive Dynamic',
    jobTitle: 'Data Platforms Director',
    showEmail: false,
    avatarVariant: 4
  },
  {
    key: 'daniel',
    name: 'Daniel Byrne',
    email: 'daniel.byrne@initech.example',
    password: 'TPSReport26!',
    headline: 'Making complex technical delivery predictable, visible and useful',
    employer: 'Initech',
    jobTitle: 'Technical Delivery Manager',
    showEmail: false,
    avatarVariant: 0
  }
];

const searchOnlyUsers = [
  // Additional exact John Smith profiles.
  ['john-smith-2', 'John Smith', 'john.smith@hooli.example', 'Senior Product Analyst', 'Hooli'],
  ['john-smith-3', 'John Smith', 'john.smith@piedpiper.example', 'Platform Operations Manager', 'Pied Piper'],

  // John {LASTNAME} profiles.
  ['john-carter', 'John Carter', 'john.carter@cyberdyne.example', 'Automation Engineer', 'Cyberdyne Systems'],
  ['john-cooper', 'John Cooper', 'john.cooper@umbrella.example', 'Infrastructure Architect', 'Umbrella Corporation'],
  ['john-murphy', 'John Murphy', 'john.murphy@aperture.example', 'Test Engineering Lead', 'Aperture Science'],
  ['john-bennett', 'John Bennett', 'john.bennett@blackmesa.example', 'Research Systems Manager', 'Black Mesa'],
  ['john-fletcher', 'John Fletcher', 'john.fletcher@starkindustries.example', 'Technical Programme Manager', 'Stark Industries'],
  ['john-hayes', 'John Hayes', 'john.hayes@wayneenterprises.example', 'Enterprise Solutions Consultant', 'Wayne Enterprises'],
  ['john-reynolds', 'John Reynolds', 'john.reynolds@oceanic.example', 'Network Services Lead', 'Oceanic Airlines'],
  ['john-walsh', 'John Walsh', 'john.walsh@bluesun.example', 'Information Security Analyst', 'Blue Sun Corporation'],
  ['john-collins', 'John Collins', 'john.collins@soylent.example', 'Business Systems Manager', 'Soylent Corporation'],
  ['john-doyle', 'John Doyle', 'john.doyle@wonka.example', 'Digital Experience Manager', 'Wonka Industries'],

  // {FIRSTNAME} Smith profiles.
  ['adam-smith', 'Adam Smith', 'adam.smith@evilcorp.example', 'Financial Systems Analyst', 'E Corp'],
  ['alice-smith', 'Alice Smith', 'alice.smith@octan.example', 'Application Support Lead', 'Octan Corporation'],
  ['ben-smith', 'Ben Smith', 'ben.smith@globex.example', 'Solutions Architect', 'Globex Corporation'],
  ['chloe-smith', 'Chloe Smith', 'chloe.smith@vandelay.example', 'Client Success Manager', 'Vandelay Industries'],
  ['david-smith', 'David Smith', 'david.smith@gringotts.example', 'Risk Technology Specialist', 'Gringotts Bank'],
  ['emma-smith', 'Emma Smith', 'emma.smith@prestige.example', 'Brand Communications Manager', 'Prestige Worldwide'],
  ['fiona-smith', 'Fiona Smith', 'fiona.smith@oscorp.example', 'Research Project Coordinator', 'Oscorp'],
  ['liam-smith', 'Liam Smith', 'liam.smith@vehement.example', 'DevOps Engineer', 'Vehement Capital Partners'],
  ['maya-smith', 'Maya Smith', 'maya.smith@momcorp.example', 'Robotics Product Manager', 'MomCorp'],
  ['nathan-smith', 'Nathan Smith', 'nathan.smith@planetexpress.example', 'Logistics Systems Engineer', 'Planet Express'],

  // General search population. Most names are deliberately ordinary.
  ['aisha-khan', 'Aisha Khan', 'aisha.khan@umbrella.example', 'Identity and Access Engineer', 'Umbrella Corporation'],
  ['alan-brooks', 'Alan Brooks', 'alan.brooks@cyberdyne.example', 'Machine Learning Engineer', 'Cyberdyne Systems'],
  ['amelia-ward', 'Amelia Ward', 'amelia.ward@hooli.example', 'UX Research Lead', 'Hooli'],
  ['andrew-kelly', 'Andrew Kelly', 'andrew.kelly@initech.example', 'Business Applications Manager', 'Initech'],
  ['cara-nolan', 'Cara Nolan', 'cara.nolan@massivedynamic.example', 'Data Governance Consultant', 'Massive Dynamic'],
  ['charlie-rivers', 'Charlie Rivers', 'charlie.rivers@piedpiper.example', 'Compression Research Engineer', 'Pied Piper'],
  ['claire-morgan', 'Claire Morgan', 'claire.morgan@wayneenterprises.example', 'Cyber Risk Manager', 'Wayne Enterprises'],
  ['declan-ryan', 'Declan Ryan', 'declan.ryan@tyrell-corp.example', 'Systems Reliability Engineer', 'Tyrell Corporation'],
  ['eileen-foster', 'Eileen Foster', 'eileen.foster@aperture.example', 'Laboratory Systems Analyst', 'Aperture Science'],
  ['ethan-price', 'Ethan Price', 'ethan.price@blackmesa.example', 'Computational Researcher', 'Black Mesa'],
  ['grace-turner', 'Grace Turner', 'grace.turner@starkindustries.example', 'Technology Partnerships Lead', 'Stark Industries'],
  ['hannah-lee', 'Hannah Lee', 'hannah.lee@weyland-yutani.example', 'Fleet Technology Coordinator', 'Weyland-Yutani'],
  ['harry-mason', 'Harry Mason', 'harry.mason@bluesun.example', 'Security Operations Engineer', 'Blue Sun Corporation'],
  ['isabel-clarke', 'Isabel Clarke', 'isabel.clarke@globex.example', 'Enterprise Account Executive', 'Globex Corporation'],
  ['james-wilson', 'James Wilson', 'james.wilson@octan.example', 'Cloud Platform Engineer', 'Octan Corporation'],
  ['jenny-taylor', 'Jenny Taylor', 'jenny.taylor@soylent.example', 'Digital Marketing Manager', 'Soylent Corporation'],
  ['kevin-lam', 'Kevin Lam', 'kevin.lam@oscorp.example', 'Network Security Specialist', 'Oscorp'],
  ['laura-hughes', 'Laura Hughes', 'laura.hughes@wonka.example', 'Product Design Manager', 'Wonka Industries'],
  ['lucas-green', 'Lucas Green', 'lucas.green@planetexpress.example', 'Transport Systems Analyst', 'Planet Express'],
  ['megan-davis', 'Megan Davis', 'megan.davis@evilcorp.example', 'Governance and Compliance Lead', 'E Corp'],
  ['michael-flynn', 'Michael Flynn', 'michael.flynn@vandelay.example', 'Import Export Systems Manager', 'Vandelay Industries'],
  ['naomi-patel', 'Naomi Patel', 'naomi.patel@prestige.example', 'Content Strategy Director', 'Prestige Worldwide'],
  ['owen-bishop', 'Owen Bishop', 'owen.bishop@oceanic.example', 'Service Delivery Analyst', 'Oceanic Airlines'],
  ['rachel-evans', 'Rachel Evans', 'rachel.evans@gringotts.example', 'Security Assurance Manager', 'Gringotts Bank'],
  ['samuel-king', 'Samuel King', 'samuel.king@momcorp.example', 'Industrial Automation Specialist', 'MomCorp'],
  ['sophie-bell', 'Sophie Bell', 'sophie.bell@vehement.example', 'Technology Investment Analyst', 'Vehement Capital Partners']
].map(([key, name, email, jobTitle, employer], index) => ({
  key,
  name,
  email,
  password: 'Welcome123!',
  headline: `${jobTitle} focused on practical delivery, collaboration and measurable outcomes`,
  employer,
  jobTitle,
  showEmail: false,
  avatarVariant: index % 5
}));

const users = [...postingUsers, ...searchOnlyUsers].map(user => ({
  ...user,
  autoAccept: true,
  seededUser: true
}));


module.exports = { users, postingUserKeys: postingUsers.map(user => user.key) };
