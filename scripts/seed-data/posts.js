module.exports = function buildPosts({ daysAgo, conferenceDaysBefore, minutesAgo, conferenceLabel, ctfFlag }) {
const johnTimeline = [
  // Each CUPP clue is separated from the next clue by 2-5 neutral professional posts.
  ['john-clue-four-months', 150, 9, 15, 'Four months into my role at GlobalPharma plc and I am still impressed by the culture, the people and the ambition across the business. It already feels like I have been part of the team for years.'],
  ['john-fill-01', 146, 14, 5, 'A useful campaign brief should remove ambiguity before anyone starts designing. Audience, objective and evidence first.'],
  ['john-fill-02', 142, 10, 35, 'Spent the morning reviewing how our marketing calendar maps to product milestones. Better alignment now means fewer rushed approvals later.'],
  ['john-fill-03', 138, 16, 20, 'Strong brand work is usually the result of disciplined collaboration rather than one big creative moment.'],

  ['john-clue-father', 133, 8, 40, 'Being a father to Jack. has made me a better marketer. Over the last 4 years, every day is a lesson in listening, adapting the message and finding the one idea that genuinely connects. Parenting may be the ultimate masterclass in audience engagement.'],
  ['john-fill-04', 129, 11, 10, 'Good marketing does not make technical work simpler than it is. It makes the value of that work easier to understand.'],
  ['john-fill-05', 125, 15, 45, 'A productive stakeholder meeting ends with fewer open questions and clear owners for the ones that remain.'],

  ['john-clue-christmas', 120, 12, 5, 'A small advantage of having a child born on Christmas Day: the gift planning is incredibly efficient. One calendar reminder, one very busy shopping list.'],
  ['john-fill-06', 116, 9, 25, 'Reviewed our latest campaign performance this morning. The most useful metric is still the one that changes a decision.'],
  ['john-fill-07', 112, 13, 50, 'Clear internal communication is often the difference between a launch feeling coordinated and merely happening on time.'],
  ['john-fill-08', 108, 16, 10, 'The strongest creative reviews focus on whether the work solves the brief, not whether everyone would have designed it the same way.'],
  ['john-fill-09', 104, 10, 20, 'A good marketing operations process should create space for better ideas rather than add ceremony around them.'],

  ['john-clue-leap-year', 99, 10, 30, 'Being born on a leap year can be hard. Technically I am only 10 years old, which makes the Marketing Director title feel slightly premature.'],
  ['john-fill-10', 95, 14, 15, 'Campaign planning improves quickly when assumptions are written down and tested instead of carried silently between teams.'],
  ['john-fill-11', 91, 9, 45, 'The best reports are short enough to read and specific enough to act on.'],
  ['john-fill-12', 87, 15, 30, 'Another strong working session with product and engineering today. Shared context solves more problems than another status meeting.'],

  ['john-clue-old-email', 82, 14, 10, 'Found an old account today and was reminded that my email used to be JohnnyBoy1986@live.ie. Safe to say JohnnyBoy eventually moved on to something a little more professional.'],
  ['john-fill-13', 78, 10, 5, 'A brand promise is only useful when customers can recognise it in the product experience.'],
  ['john-fill-14', 74, 16, 35, 'Finalised a new campaign measurement framework today. Fewer vanity metrics, more evidence tied to actual outcomes.'],
  ['john-fill-15', 70, 11, 40, 'Marketing teams move faster when review stages have a clear purpose and a named decision-maker.'],
  ['john-fill-16', 66, 15, 5, 'The best cross-functional plans leave room for teams to adapt without losing the core objective.'],

  ['john-clue-music', 61, 17, 25, 'End-of-week soundtrack sorted. AC/DC will always be my favourite band, and Back In Black is still the first song on the office playlist when a campaign finally goes live.'],
  ['john-fill-17', 57, 9, 30, 'A launch retrospective should explain what to repeat next time, not only what went wrong this time.'],
  ['john-fill-18', 53, 13, 15, 'We completed a useful messaging workshop today. The winning line was the clearest one, not the cleverest one.'],
  ['john-fill-19', 49, 16, 50, 'Consistency across channels is easier when everyone works from the same source material and the same evidence.'],

  ['john-clue-books', 44, 19, 0, 'The Lord of the Rings remains my favourite book series of all time. Legolas has always been my favourite character. Focus, precision and excellent hair are difficult qualities to argue with.'],
  ['john-fill-20', 40, 10, 10, 'Good positioning creates a useful boundary around what a campaign should and should not try to say.'],
  ['john-fill-21', 36, 14, 45, 'A successful event campaign starts long before the event. Clear objectives make every later production choice easier.'],

  ['john-clue-hotel', 31, 11, 45, 'Very grateful that GlobalPharma has arranged a company-paid five-star hotel for Jane and me during ITCON26. It will make a packed conference week much easier, and Jane is considerably more excited about the hotel breakfast than my booth plans.'],
  ['john-fill-22', 27, 9, 20, 'The ITCON26 content plan is now moving from draft to production. Strong input from the engineering and clinical technology teams.'],
  ['john-fill-23', 23, 13, 30, 'Event messaging works best when every demonstration supports the same central story.'],
  ['john-fill-24', 19, 16, 0, 'Completed the first full booth-content review today. Plenty to refine, but the structure is holding together well.'],
  ['john-fill-25', 15, 10, 50, 'The final weeks before an event are mostly about protecting clarity while the volume of detail increases.']
].map(([key, days, hour, minute, content]) => ({
  key,
  user: 'john-target',
  at: daysAgo(days, hour, minute),
  content
}));


// Search-population users also receive a small number of neutral professional posts.
// This keeps the older feed varied without adding personal details that could
// contaminate the password-building portion of the challenge.
const broaderUserKeys = [
  'john-smith-2', 'john-smith-3',
  'john-carter', 'john-cooper', 'john-murphy', 'john-bennett', 'john-fletcher',
  'john-hayes', 'john-reynolds', 'john-walsh', 'john-collins', 'john-doyle',
  'adam-smith', 'alice-smith', 'ben-smith', 'chloe-smith', 'david-smith',
  'emma-smith', 'fiona-smith', 'liam-smith', 'maya-smith', 'nathan-smith',
  'aisha-khan', 'alan-brooks', 'amelia-ward', 'andrew-kelly', 'cara-nolan',
  'charlie-rivers', 'claire-morgan', 'declan-ryan', 'eileen-foster',
  'ethan-price', 'grace-turner', 'hannah-lee', 'harry-mason', 'isabel-clarke',
  'james-wilson', 'jenny-taylor', 'kevin-lam', 'laura-hughes', 'lucas-green',
  'megan-davis', 'michael-flynn', 'naomi-patel', 'owen-bishop',
  'rachel-evans', 'samuel-king', 'sophie-bell'
];

const professionalPostTemplates = [
  'A useful project update should make the next decision easier, not simply describe the work already completed.',
  'Good technical collaboration starts with shared context and ends with clear ownership of the next action.',
  'Completed a productive review today. The most valuable outcome was a shorter list of assumptions and better evidence for the remaining ones.',
  'Process improvements are most useful when they remove repeated effort without hiding important checks.',
  'A strong delivery plan makes dependencies visible early enough for the team to do something about them.',
  'Documentation creates value when it helps another person make a correct decision without needing the original author in the room.',
  'The best technical discussions separate facts, constraints and preferences before trying to choose a solution.',
  'Small improvements to feedback loops usually create more value than another layer of reporting.',
  'A good workshop ends with decisions, owners and a clear record of what still needs evidence.',
  'Teams move faster when quality expectations are agreed before the work reaches final review.',
  'The most useful metrics are the ones that expose a decision, a risk or a change in behaviour.',
  'Another reminder that clear interfaces between teams matter just as much as clear interfaces between systems.',
  'Reliable delivery depends on making uncertainty visible rather than pretending it has already been resolved.',
  'A successful handover should transfer context and decision history, not only a folder of documents.',
  'Good prioritisation is less about finding more time and more about being explicit about what will not be done yet.',
  'A practical roadmap should connect each investment to a capability the organisation can actually use.',
  'The strongest reviews focus on whether the work meets its purpose rather than whether everyone would have approached it the same way.',
  'Useful automation removes repetition while keeping failures visible and understandable.',
  'A concise status update with evidence is usually more valuable than a polished report with no clear decision attached.',
  'Cross-functional work improves quickly when language, assumptions and expected outcomes are made explicit.'
];

const broaderUserPosts = broaderUserKeys.flatMap((user, userIndex) => {
  const postCount = 1 + (userIndex % 3);

  return Array.from({ length: postCount }, (_, postIndex) => {
    const templateIndex = (userIndex * 3 + postIndex * 7) % professionalPostTemplates.length;
    const days = 4 + ((userIndex * 17 + postIndex * 43) % 172);
    const hour = 8 + ((userIndex + postIndex * 3) % 10);
    const minute = (userIndex * 11 + postIndex * 19) % 60;

    return {
      key: `${user}-feed-${postIndex + 1}`,
      user,
      at: daysAgo(days, hour, minute),
      content: professionalPostTemplates[templateIndex]
    };
  });
});

const posts = [
  ...johnTimeline,
  ...broaderUserPosts,

  // Elloit Alderson: required posts, mixed with Realphotography content.
  {
    key: 'elloit-workflow',
    user: 'elloit',
    at: daysAgo(58, 11, 30),
    content: 'A corporate image library works best when it documents real work rather than staging an approximation of it. Authenticity is visible in the details.'
  },
  {
    key: 'elloit-inbox',
    user: 'elloit',
    at: daysAgo(51, 16, 20),
    content: 'Does anyone ever check their inbox and see emails they never sent? so weird'
  },
  {
    key: 'elloit-colour',
    user: 'elloit',
    at: daysAgo(44, 14, 0),
    content: 'We completed a full colour workflow review at Realphotography today. Consistency across capture, editing and delivery saves more time than any single tool.'
  },
  {
    key: 'elloit-dog',
    user: 'elloit',
    at: daysAgo(37, 18, 10),
    content: 'Unpopular office debate settled: I am firmly a dog person. They are loyal, observant and somehow always know when a long editing session needs to end.'
  },
  {
    key: 'elloit-portfolio',
    user: 'elloit',
    at: daysAgo(29, 17, 45),
    content: 'Finished reviewing the latest Realphotography portfolio update. Excellent work from a team that understands both the technical and human side of visual communication.'
  },
  {
    key: 'elloit-event-plan',
    user: 'elloit',
    at: daysAgo(12, 10, 15),
    content: 'The strongest event photography plan starts before anyone arrives: lighting tests, movement routes, shot priorities and a clear delivery schedule.'
  },

  // Conference discussion, distributed from T-3 through T-0.
  {
    key: 'sarah-itcon-3',
    user: 'sarah',
    at: conferenceDaysBefore(3, 9, 10),
    content: `Three days to ITCON26. Our demo environment is stable, the final cloud architecture diagrams are approved and the team is ready for ${conferenceLabel}. Looking forward to meeting engineers who enjoy solving difficult infrastructure problems.`
  },
  {
    key: 'marcus-itcon-3',
    user: 'marcus',
    at: conferenceDaysBefore(3, 15, 20),
    content: 'The final security review for our ITCON26 showcase is complete. We will be demonstrating how secure-by-design decisions can improve delivery rather than slow it down.'
  },
  {
    key: 'john-itcon-3',
    user: 'john-target',
    at: conferenceDaysBefore(3, 18, 5),
    content: 'Three days until ITCON26. The GlobalPharma campaign team has moved into final review mode and the booth story is now coming together across marketing, engineering and clinical technology.'
  },
  {
    key: 'priya-itcon-2',
    user: 'priya',
    at: conferenceDaysBefore(2, 9, 40),
    content: 'Two days of final preparation left before ITCON26. The Massive Dynamic team will be showing a practical data platform workflow from ingestion through governance and reporting.'
  },
  {
    key: 'daniel-itcon-2',
    user: 'daniel',
    at: conferenceDaysBefore(2, 14, 30),
    content: 'ITCON26 build list checked twice. Screens, demo laptops, backup cables and the one adapter nobody remembers until setup day are all packed.'
  },
  {
    key: 'sarah-itcon-2',
    user: 'sarah',
    at: conferenceDaysBefore(2, 17, 15),
    content: 'The final rehearsal surfaced two small issues and one useful simplification. Exactly what a rehearsal should do before ITCON26.'
  },
  {
    key: 'elloit-globalpharma',
    user: 'elloit',
    at: conferenceDaysBefore(1, 9, 15),
    content: 'Delighted that Realphotography will be joining GlobalPharma for their upcoming booth at ITCON26. We have been working on a visual installation that should make the campaign impossible to walk past.'
  },
  {
    key: 'john-itcon-prep',
    user: 'john-target',
    at: conferenceDaysBefore(1, 13, 10),
    content: 'The GlobalPharma plc ITCON26 booth is starting to come together. Messaging signed off, demonstrations rehearsed and the final print run approved. A lot of work remains, but the team has built something worth seeing.'
  },
  {
    key: 'marcus-itcon-1',
    user: 'marcus',
    at: conferenceDaysBefore(1, 18, 20),
    content: 'Our ITCON26 team briefing is done. I will be around the Weyland-Yutani booth throughout the event to talk security architecture, threat modelling and where controls fail in real deployments.'
  },
  {
    key: 'priya-itcon-1',
    user: 'priya',
    at: conferenceDaysBefore(1, 20, 5),
    content: 'One final validation pass before ITCON26. The best data demonstrations make the governance visible without turning it into the entire story.'
  },
  {
    key: 'daniel-itcon-today',
    user: 'daniel',
    at: minutesAgo(55),
    content: 'Final ITCON26 logistics call complete. Every event plan eventually becomes a spreadsheet, a checklist and several people asking who has the extension leads.'
  },
  {
    key: 'sarah-itcon-today',
    user: 'sarah',
    at: minutesAgo(42),
    content: 'ITCON26 is underway. The Tyrell Corporation demo environment is live and the first technical conversations have already justified the preparation.'
  },
  {
    key: 'priya-itcon-today',
    user: 'priya',
    at: minutesAgo(31),
    content: 'The ITCON26 cases are unpacked and the demo data has passed its final validation. Excited to see what the other teams are bringing this year.'
  },
  {
    key: 'elloit-itcon-today',
    user: 'elloit',
    at: minutesAgo(24),
    content: 'The Realphotography installation at the GlobalPharma booth is live. Great to finally see the lighting, screens and campaign visuals working together in the space.'
  },
  {
    key: 'john-itcon-final',
    user: 'john-target',
    at: minutesAgo(15),
    content: 'ITCON26 is here and the energy across GlobalPharma is excellent. Proud of the marketing, engineering and clinical technology teams for turning months of work into one clear story.'
  },

  // Neutral professional posts from the other active users.
  {
    key: 'sarah-extra-1', user: 'sarah', at: daysAgo(46, 8, 55),
    content: 'Infrastructure documentation is most useful when it explains why a decision was made, not only what was deployed.'
  },
  {
    key: 'sarah-extra-2', user: 'sarah', at: daysAgo(25, 12, 40),
    content: 'Completed a successful resilience test across our staging environment today. The useful result was not that everything worked, but that the failure paths were understandable.'
  },
  {
    key: 'sarah-extra-3', user: 'sarah', at: daysAgo(8, 15, 25),
    content: 'A productive architecture review leaves the team with fewer unknowns and a short list of decisions that have named owners.'
  },
  {
    key: 'marcus-extra-1', user: 'marcus', at: daysAgo(50, 9, 10),
    content: 'Threat modelling is at its best when it changes a design while change is still inexpensive.'
  },
  {
    key: 'marcus-extra-2', user: 'marcus', at: daysAgo(32, 16, 15),
    content: 'Security controls should be tested against the behaviour they are meant to stop, not only checked against a deployment list.'
  },
  {
    key: 'marcus-extra-3', user: 'marcus', at: daysAgo(13, 11, 5),
    content: 'Good security architecture gives operational teams useful choices during an incident instead of one brittle path.'
  },
  {
    key: 'priya-extra-1', user: 'priya', at: daysAgo(47, 10, 45),
    content: 'Data quality work becomes much easier when ownership is established at the point of creation rather than during reporting.'
  },
  {
    key: 'priya-extra-2', user: 'priya', at: daysAgo(28, 14, 35),
    content: 'A platform roadmap should connect technical investment to the decisions people need to make with the resulting data.'
  },
  {
    key: 'priya-extra-3', user: 'priya', at: daysAgo(6, 9, 50),
    content: 'The team completed another successful governance workshop today. Clear definitions continue to solve more problems than complicated dashboards.'
  },
  {
    key: 'daniel-extra-1', user: 'daniel', at: daysAgo(44, 13, 5),
    content: 'Delivery confidence comes from visible dependencies, honest status reporting and decisions made before they become urgent.'
  },
  {
    key: 'daniel-extra-2', user: 'daniel', at: daysAgo(24, 10, 25),
    content: 'A useful project plan is not the longest one. It is the one the team actually checks before making a commitment.'
  },
  {
    key: 'daniel-extra-3', user: 'daniel', at: daysAgo(8, 16, 50),
    content: 'Closed out a productive delivery review this afternoon. Risks are far easier to manage once they are written plainly and assigned to someone.'
  },

  // CTF objective, visible only while authenticated as the target John Smith account.
  {
    key: 'john-private-flag',
    user: 'john-target',
    at: minutesAgo(5),
    private: true,
    content: `Private ITCON26 booth note: ${ctfFlag}`
  }
];


  return posts;
};
