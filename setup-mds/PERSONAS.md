## Personas

The first thing it should do is clean the DB so no other users exist. Itll be used as the fresh start script ifgm.

First off, all users should be talking about the upcoming Irish ECSC Qualifiers CTF on Saturday the 5th of Sept 2026.
This is a CTF where players will compete to gain a position on the Irish ECSC Team. Please google ECSC and the Irish Team (Run by ZeroDays) to properly understand the context

There should be multiple users created for this challenge, please refer to the `SEED_CONTEXT.md` for more infomration on seeding users.
The goal is for competitors to use the Main Users posts to understand about his personal life, and create a custom CUPP wordlist contanining his password.

### Main Target
The following information will be intended to be input into CUPP by competitors. This information should be sublty dropped in posts for the competitors to understand
Name: James Schlung
Nickname: Jimmy
Work: Founder at DayZeroCTF
DoB: 29/02/1996 -- Leap Year Birthday
Wife: Jannet
Wife DoB: 05/09/1995
Child: Stevie
Child DoB: 31/12/2024
Dog: MrRobot
Hobbies: Robotics, Hacking, OPSec, Hating on ZeroDays, Calling ZeroDaysSkids

He should make posts about the upcoming qualifiers and how he was preparing for it. Spattered in on these posts john should make comments or posts naturally including the following (Will be used for CUPP). These should all be on previous days going back before the posts about the Quals. They should not all be on the same day. I will provide his profile pic seperately, for now refer to it as firstname.png

The target will post about how being born on a leap year technically only makes them only 7.5 years old
How ZeroDays are terrible for hosting the quals on his wifes birthday
That his son Stevie being born on christmass makes getting gifts easy
On a post from Dissenter Lane about his cats, he will comment about his dog MrRobot being better.

Finally he should post about how on the day of the Quals he only found out the age limit was 25, and ZeroDays will rue the day we didnt let him complete.

These posts are essential to the password crafting portion, but should not be his only posts. These should be interspined with some generic posts about GlobalPharma and being a marketing exec.

his email should be jimmyschlung@pm.me. It should be visible on his profile. His password will be `jimmy_1996`

There should be 20 other random posts in addition to this. Avoid anything that would accidentally be added as password like perosnal stuff. Only professional things.

Context for the users persona:
  - Makes enormous, unverifiable claims with total confidence.
  - Claims to trace people, compromise devices, uncover organisations, or control infrastructure after trivial disagreements.
  - Gives little technical detail because he does not understand much.
  - Treats obvious mistakes and coincidences as proof of his abilities.
  - Invents excuses when challenged: evidence is “classified,” missing proof demonstrates good operational security, or he stopped because the target was
    beneath him.
  - Escalates playground arguments into supposed international cyber incidents.
  - Occasionally contradicts himself without noticing.
  - Is unintentionally funny but never deliberately tells hacker jokes.
  - Calls ZeroDays and its members “skids.”
  - Believes he has infiltrated, defeated, or outsmarted ZeroDays, despite providing no credible evidence.
  - Has a petty, one-sided vendetta against ZeroDays but should not mention them in every post.

  Use simple, conversational language with minimal jargon or tool names. Do not make him genuinely competent. Avoid detailed hacking methods, real personal
  information, serious criminal allegations, or credible threats. The humour should come from the gap between his mundane life and his ridiculous self-
  importance.

Other information:

- The Irish Quals is the shared event used to tie several users and posts together.
- Seed several additional normal users who post around the Quals, including posts from roughly **T-4 through the event day**.
- These users should be the following (Each will have a PFP I will supply later, for now link it to firstname.png:
	- Miasto Corkonian - Forensic Coach for ZeroDays
	- Misc Master - Misc Coach for ZeroDays
        - Note: User Misc Master should be batshit insane cyber person. Absolutely nuts.
	- M0z Skiddington - Web Coach for ZeroDays
	- Blank Amber - Crypto Coach for ZeroDays
	- 12th Rockyouster - Coach Coach for ZeroDays
	- Dissenter Lane - Founder for ZeroDays
- Other users should be known fictional hackers from popculture and media, Including mr. robot, hackers, and watchdogs. Profile pictures for these users should be obtained and placed in `scripts/seed-data/assets/avatars/`
- Create additional **search-only users** who do not need posting histories.
- Search population must include:
  - Multiple different **Jimmy Schulng** accounts with unrelated jobs/companies.
  - Multiple **Jimmy {LASTNAME}** users.
  - Multiple **{FIRSTNAME} Schlung** users.
  - Other ordinary professional profiles to make search populated and realistic.
- The correct Jimmy Schlung should therefore not be uniquely identifiable just by searching the name.
- Seeded posts should resemble normal LinkedIn activity: professional updates, work commentary, qualifier preparation, event posts and occasional casual/personal oversharing.
- Challenge-relevant information should be mixed between ordinary filler posts rather than every post obviously containing a clue.
- Posts should have realistic spacing and dates rather than all being created at once.
- Background/search-only users should generally remain inactive and exist primarily to make the site/search feel populated.
- Seeded users should use the hidden `SeededUser` flag so their profile/posts cannot be modified through the application.
- Seeded users can use the hidden `AutoAccept` flag so connection requests are automatically accepted.
- Connections are cosmetic only and do not determine what appears in the feed.
- Public posts are globally visible and ordered newest-first.

