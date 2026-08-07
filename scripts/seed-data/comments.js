module.exports = function buildComments({ daysAgo, conferenceDaysBefore, minutesAgo }) {
const comments = [
  {
    post: 'elloit-dog',
    user: 'john-target',
    at: daysAgo(1, 2, 3),
    content: 'My cat Twinkle is my true first child, so I will have to disagree with you on this one.'
  },
  {
    post: 'elloit-dog',
    user: 'sarah',
    at: daysAgo(36, 10, 5),
    content: 'This may be the most divisive professional discussion on my feed this week.'
  },
  {
    post: 'elloit-globalpharma',
    user: 'john-target',
    at: conferenceDaysBefore(1, 11, 0),
    content: 'The preview looks excellent. Looking forward to seeing the full installation on the booth.'
  },
  {
    post: 'john-itcon-prep',
    user: 'elloit',
    at: conferenceDaysBefore(1, 14, 0),
    content: 'The visual side is nearly ready. The Realphotography team will see you at setup.'
  },
  {
    post: 'john-itcon-prep',
    user: 'priya',
    at: conferenceDaysBefore(1, 14, 20),
    content: 'Looking forward to visiting the booth. The programme has a strong industry mix this year.'
  },
  {
    post: 'john-itcon-prep',
    user: 'daniel',
    at: conferenceDaysBefore(1, 14, 40),
    content: 'The final day before an event always moves quickly. Best of luck with setup.'
  },
  {
    post: 'sarah-itcon-2',
    user: 'marcus',
    at: conferenceDaysBefore(2, 18, 0),
    content: 'Agreed. Rehearsals are valuable precisely because they find small failures before the audience does.'
  },
  {
    post: 'priya-itcon-today',
    user: 'sarah',
    at: minutesAgo(27),
    content: 'Looking forward to the platform demonstration.'
  },
  {
    post: 'daniel-itcon-today',
    user: 'elloit',
    at: minutesAgo(48),
    content: 'We have the extension leads. For once.'
  }
];


  return comments;
};
