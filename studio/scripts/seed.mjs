import {getCliClient} from 'sanity/cli';

const client = getCliClient({apiVersion: '2026-10-01'});
const topics = [
  ['team-agreements', 'Team Agreements'],
  ['better-meetings', 'Better Meetings'],
  ['team-identity', 'Team Identity'],
  ['strategy', 'Strategy'],
];
let transaction = client.transaction();
for (const [slug, title] of topics) {
  transaction = transaction.createIfNotExists({_id: `topic.${slug}`, _type: 'topic', title, slug: {_type: 'slug', current: slug}});
}
transaction = transaction.createIfNotExists({_id: 'author.yosr-najjar', _type: 'author', name: 'Yosr Najjar'});
const result = await transaction.commit();
console.log(`OI's four topics and initial author are ready. Transaction: ${result.transactionId}`);
