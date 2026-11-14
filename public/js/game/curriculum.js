/**
 * The story campaign. Each mission is plain data:
 *   lesson -> something to read
 *   task   -> something to do in the simulator; check(ctx) says when it is done
 *   quiz   -> a multiple-choice question; wrong answers cost stars
 *
 * Task checks receive { counts, last, state }: how many times each operation ran during
 * this task, the last operation ({ op, args, result }), and the structure's state().
 */

const did = (op, times = 1) => ({ counts }) => (counts[op] ?? 0) >= times;
const lastWas = (op, predicate = () => true) => ({ last }) => last?.op === op && predicate(last);

export const ACTS = Object.freeze([
  { id: 'act-1', number: 1, title: 'The Silent Archive', tier: 'Novice', blurb: 'The Citadel\'s great Archive has gone dark. Restore its oldest machines: rows, piles and lines.' },
  { id: 'act-2', number: 2, title: 'The Chain Bridges', tier: 'Apprentice', blurb: 'Beyond the Archive lie bridges of linked stones and a hall of a thousand lockers.' },
  { id: 'act-3', number: 3, title: 'The Branching Forest', tier: 'Adept', blurb: 'Data grows like trees here. Learn to search, climb and prune them.' },
  { id: 'act-4', number: 4, title: 'The Tower of Balance', tier: 'Master', blurb: 'The final tower tests balance, connection and judgement.' },
]);

export const MISSIONS = Object.freeze([
  {
    id: 'first-steps',
    act: 'act-1',
    title: 'Wake the Archive',
    structure: 'array',
    setup: [['append', 7], ['append', 3], ['append', 9]],
    reward: { xp: 60, badge: { name: 'First Light', mark: 'A' } },
    steps: [
      {
        type: 'lesson',
        title: 'The Archive is silent',
        text: [
          'Welcome, Keeper. I am Byte, the last working machine in the Citadel. Every record we own is scattered, and finding anything takes days.',
          'A data structure is simply a way of arranging data so that the jobs you care about - finding, adding, removing - are fast. Choosing the right arrangement is most of the battle.',
        ],
      },
      {
        type: 'lesson',
        title: 'Your first structure: the array',
        text: [
          'An array is a row of equal-sized slots placed side by side in memory. Each slot has a number, called its index.',
          'Indexes start at 0, not 1. The first slot is index 0, the second is index 1, and so on.',
        ],
        points: ['Slots sit next to each other in memory', 'Indexes start at 0', 'Every slot holds one value'],
      },
      { type: 'task', text: 'Use Append three times to add any three values to the end of the array.', hint: 'Type a number in the Append box and press Run. Do it three times.', check: did('append', 3) },
      {
        type: 'lesson',
        title: 'Why arrays are fast to read',
        text: [
          'Because slots are equal-sized and contiguous, the computer finds slot i with one calculation: address = start + i x slotSize.',
          'That means reading slot 2 or slot 2,000,000 costs the same single step. We call this constant time, written O(1).',
        ],
      },
      { type: 'task', text: 'Use Get to read the value at index 2.', hint: 'Enter 2 in the Get box.', check: lastWas('get', (last) => last.args[0] === 2) },
      { type: 'quiz', question: 'What is the index of the first element in an array?', options: ['1', '0', '-1', 'It depends on the value'], answer: 1, explain: 'Arrays are zero-indexed: the first slot is at offset 0 from the start.' },
      { type: 'quiz', question: 'An array holds one million values. How many steps does it take to read the value at index 500,000?', options: ['500,000', 'About 20', 'One', 'One million'], answer: 2, explain: 'Index access is a single address calculation, so it is O(1) no matter the size.' },
    ],
  },
  {
    id: 'array-costs',
    act: 'act-1',
    title: 'The Shifting Shelves',
    structure: 'array',
    setup: [10, 20, 30, 40, 50].map((v) => ['append', v]),
    reward: { xp: 60, badge: { name: 'Big-O Scout', mark: 'O' } },
    steps: [
      {
        type: 'lesson',
        title: 'Measuring cost with Big-O',
        text: [
          'Big-O notation describes how the work grows as the data grows. We count steps, not seconds, and we care about large inputs.',
          'O(1) means the work stays the same. O(n) means the work grows in step with the number of items n.',
        ],
        points: ['O(1): constant - does not grow', 'O(n): linear - doubles when n doubles', 'We usually describe the worst case'],
      },
      {
        type: 'lesson',
        title: 'The price of a gap',
        text: [
          'Arrays have no gaps. To insert at the front, every value must first shift one slot to the right. To remove from the front, every value shifts left.',
          'So inserting or removing near the start of an array is O(n). Watch it happen.',
        ],
      },
      { type: 'task', text: 'Insert any value at index 0 and watch every element shift right.', hint: 'Use "Insert at" with index 0.', check: lastWas('insertAt', (last) => last.args[0] === 0 && last.result === true) },
      { type: 'task', text: 'Remove the value at index 0.', hint: 'Use "Remove at" with index 0.', check: lastWas('removeAt', (last) => last.args[0] === 0 && last.result !== null) },
      {
        type: 'lesson',
        title: 'Searching without a map',
        text: [
          'If you do not know where a value is, you must check slots one by one. This is linear search, and its worst case - the value is missing - checks all n slots.',
        ],
      },
      { type: 'task', text: 'Run a linear search for a value that is NOT in the array.', hint: 'Try 999.', check: lastWas('search', (last) => last.result === -1) },
      { type: 'quiz', question: 'What is the worst-case cost of inserting at the front of an array with n elements?', options: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'], answer: 2, explain: 'All n elements must shift one place to the right.' },
      { type: 'quiz', question: 'An O(n) algorithm takes 1 second for 1,000 items. Roughly how long for 2,000 items?', options: ['1 second', '2 seconds', '4 seconds', '1,000 seconds'], answer: 1, explain: 'Linear work doubles when the input doubles.' },
      { type: 'quiz', question: 'Appending to the end of an array with free space costs...', options: ['O(1)', 'O(n)', 'O(log n)', 'It depends on the value'], answer: 0, explain: 'Nothing has to move: the value goes straight into the next free slot.' },
    ],
  },
  {
    id: 'stack',
    act: 'act-1',
    title: 'The Tower of Plates',
    structure: 'stack',
    setup: [['push', 4]],
    reward: { xp: 60, badge: { name: 'Stack Keeper', mark: 'S' } },
    steps: [
      {
        type: 'lesson',
        title: 'Last in, first out',
        text: [
          'The Archive kitchen stacks its plates. You always put a plate on top, and you always take the top one. That rule is called LIFO: last in, first out.',
          'A stack has three main moves: push (add to top), pop (remove from top) and peek (look at top). All three are O(1).',
        ],
        points: ['push - add on top', 'pop - remove from top', 'peek - look without removing'],
      },
      { type: 'task', text: 'Push three values onto the stack.', hint: 'Use Push three times.', check: did('push', 3) },
      { type: 'task', text: 'Pop until the stack is completely empty.', hint: 'Keep pressing Pop.', check: ({ counts, state }) => (counts.pop ?? 0) > 0 && state.size === 0 },
      { type: 'task', text: 'Now press Pop one more time on the empty stack to see an underflow.', hint: 'Popping an empty stack is an error called underflow.', check: lastWas('pop', (last) => last.result === null) },
      {
        type: 'lesson',
        title: 'Where stacks live',
        text: [
          'Your editor\'s undo button is a stack of changes. Your browser\'s back button is a stack of pages. When a function calls another function, the computer pushes it on the call stack.',
          'Stacks also check balanced brackets: push every "(" and pop on every ")".',
        ],
      },
      { type: 'quiz', question: 'You push 1, then 2, then 3, then pop once. What is on top now?', options: ['1', '2', '3', 'The stack is empty'], answer: 1, explain: '3 was the last in, so it was the first out. 2 is now on top.' },
      { type: 'quiz', question: 'Which feature is naturally built with a stack?', options: ['A printer queue', 'Undo in a text editor', 'Looking up a word in a dictionary', 'Sorting numbers'], answer: 1, explain: 'Undo always reverses the most recent change first: LIFO.' },
    ],
  },
  {
    id: 'queue',
    act: 'act-1',
    title: 'The Gate Line',
    structure: 'queue',
    setup: [['enqueue', 5]],
    reward: { xp: 60, badge: { name: 'Gatekeeper', mark: 'Q' } },
    steps: [
      {
        type: 'lesson',
        title: 'First in, first out',
        text: [
          'Travellers wait at the Citadel gate in a line. Whoever arrived first is let in first. This is FIFO: first in, first out.',
          'A queue adds at the rear (enqueue) and removes from the front (dequeue). Real implementations use a circular buffer or a linked list so both are O(1).',
        ],
        points: ['enqueue - join at the rear', 'dequeue - leave from the front', 'peek - see who is next'],
      },
      { type: 'task', text: 'Enqueue three travellers (any three values).', hint: 'Use Enqueue three times.', check: did('enqueue', 3) },
      { type: 'task', text: 'Dequeue twice. Notice who leaves first.', hint: 'Press Dequeue two times.', check: did('dequeue', 2) },
      { type: 'task', text: 'Peek at who is next in line.', hint: 'Press Peek.', check: did('peek') },
      {
        type: 'lesson',
        title: 'Where queues live',
        text: ['Printers, web servers and message systems all process requests in arrival order using queues. Later in your journey, breadth-first search will use a queue to explore a map ring by ring.'],
      },
      { type: 'quiz', question: 'You enqueue A, B, C and dequeue once. Who is at the front now?', options: ['A', 'B', 'C', 'Nobody'], answer: 1, explain: 'A arrived first and left first, so B is now at the front.' },
      { type: 'quiz', question: 'Which situation calls for a queue rather than a stack?', options: ['Undoing edits', 'Serving customers in the order they arrived', 'Matching brackets', 'Going back in a browser'], answer: 1, explain: 'Fairness by arrival order is exactly FIFO.' },
    ],
  },
  {
    id: 'linked-list',
    act: 'act-2',
    title: 'The Chain Bridge',
    structure: 'linked-list',
    setup: [['insertTail', 3], ['insertTail', 8]],
    reward: { xp: 90, badge: { name: 'Link Smith', mark: 'L' } },
    steps: [
      {
        type: 'lesson',
        title: 'Stones joined by chains',
        text: [
          'The bridge ahead is made of stones scattered over the river, each chained to the next. That is a linked list: every node holds a value and a pointer to the next node.',
          'The list remembers only its head. The last node points to null, meaning "nothing after me".',
        ],
        points: ['node = value + next pointer', 'head = first node', 'the last node\'s next is null'],
      },
      { type: 'task', text: 'Insert a value at the head. Only two pointers change.', hint: 'Use "Insert at head".', check: did('insertHead') },
      { type: 'task', text: 'Insert a value at the tail. Watch how far it has to walk.', hint: 'Use "Insert at tail".', check: did('insertTail') },
      {
        type: 'lesson',
        title: 'Trading speed for flexibility',
        text: [
          'Adding at the head is O(1) - no shifting like in an array. But there is no index formula: to reach the 5th node you must follow 4 pointers. Access and search are O(n).',
          'Removing a node means finding it, then pointing its predecessor past it.',
        ],
      },
      { type: 'task', text: 'Remove a value that exists in the list.', hint: 'Pick one of the numbers you can see.', check: lastWas('remove', (last) => last.result === true) },
      { type: 'quiz', question: 'What is the cost of inserting at the head of a singly linked list?', options: ['O(1)', 'O(n)', 'O(log n)', 'O(n²)'], answer: 0, explain: 'Create the node, point it at the old head, move head. No other node is touched.' },
      { type: 'quiz', question: 'Why is reading the k-th element of a linked list slow?', options: ['Nodes are too large', 'You have to follow k pointers from the head', 'The values are sorted', 'Memory is encrypted'], answer: 1, explain: 'Nodes are scattered, so there is no address formula; you must walk.' },
    ],
  },
  {
    id: 'reverse-list',
    act: 'act-2',
    title: 'Turn the Bridge Around',
    structure: 'linked-list',
    setup: [1, 2, 3, 4].map((v) => ['insertTail', v]),
    reward: { xp: 90, badge: { name: 'Pointer Juggler', mark: 'R' } },
    steps: [
      {
        type: 'lesson',
        title: 'Three pointers, one pass',
        text: [
          'A classic interview task: reverse a linked list in place. Keep three pointers - prev, curr and next.',
          'At each node: save next, flip curr.next to prev, then move prev and curr one step forward. When curr becomes null, prev is the new head.',
        ],
        points: ['save next', 'flip curr.next to prev', 'advance prev and curr'],
      },
      { type: 'task', text: 'Search for a value that is in the list.', hint: 'Try 3.', check: lastWas('search', (last) => last.result >= 0) },
      { type: 'task', text: 'Reverse the list and step through it slowly with the step buttons.', hint: 'Press Reverse, then use the step controls.', check: lastWas('reverse', (last) => last.result === true) },
      { type: 'quiz', question: 'How much extra memory does in-place reversal need?', options: ['O(1)', 'O(n)', 'O(log n)', 'O(n²)'], answer: 0, explain: 'Only three pointers, whatever the list length.' },
      { type: 'quiz', question: 'Why must you save curr.next before flipping it?', options: ['To make it faster', 'Otherwise you lose the rest of the list', 'To keep the values sorted', 'You do not need to'], answer: 1, explain: 'Once curr.next points backwards, the only route forward is the saved pointer.' },
    ],
  },
  {
    id: 'hash-table',
    act: 'act-2',
    title: 'The Hall of Lockers',
    structure: 'hash-table',
    setup: [['insert', 15], ['insert', 10]],
    reward: { xp: 90, badge: { name: 'Hash Master', mark: 'H' } },
    steps: [
      {
        type: 'lesson',
        title: 'Jump straight to the right locker',
        text: [
          'The Hall has 7 lockers. Instead of searching all of them, a hash function turns each key into a locker number. Here it is hash(k) = k mod 7.',
          'Insert, search and delete only look inside one locker (bucket), so on average they are O(1).',
        ],
        points: ['hash(key) -> bucket index', 'only one bucket is searched', 'average O(1) for insert / search / delete'],
      },
      { type: 'task', text: 'Insert three keys of your choice.', hint: 'Any numbers from 0 to 999.', check: did('insert', 3) },
      {
        type: 'lesson',
        title: 'Collisions',
        text: [
          'Two different keys can land in the same bucket: 3 and 10 both give 3 mod 7. This is a collision.',
          'Separate chaining stores every key of a bucket in a small list. Too many collisions slow things down, so real tables grow and rehash when the load factor (keys / buckets) gets high.',
        ],
      },
      {
        type: 'task',
        text: 'Cause a collision: insert a key that lands in a bucket that already has a key.',
        hint: '15 is in bucket 1. 15 + 7 = 22 lands there too.',
        check: ({ last, state }) => last?.op === 'insert' && last.result === true && state.chainLengths[last.args[0] % 7] >= 2,
      },
      { type: 'task', text: 'Search for a key, then remove one.', hint: 'Use Search and then Remove.', check: ({ counts }) => (counts.search ?? 0) >= 1 && (counts.remove ?? 0) >= 1 },
      { type: 'quiz', question: 'With hash(k) = k mod 7, which bucket does 23 go to?', options: ['1', '2', '3', '23'], answer: 1, explain: '23 = 3 x 7 + 2, so the remainder is 2.' },
      { type: 'quiz', question: 'What is a collision?', options: ['Two keys with the same value', 'Two different keys hashing to the same bucket', 'A full table', 'A deleted key'], answer: 1, explain: 'Different keys, same bucket. Chaining or probing resolves it.' },
      { type: 'quiz', question: 'What is the worst case for search if every key collides into one bucket?', options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'], answer: 2, explain: 'The whole table degenerates into a single chain that must be scanned.' },
    ],
  },
  {
    id: 'bst',
    act: 'act-3',
    title: 'The First Branches',
    structure: 'bst',
    setup: [50, 30, 70].map((v) => ['insert', v]),
    reward: { xp: 120, badge: { name: 'Root Finder', mark: 'B' } },
    steps: [
      {
        type: 'lesson',
        title: 'Trees, roots and leaves',
        text: [
          'A tree starts at one root node. Each node can have children; nodes without children are leaves. In a binary tree, each node has at most two children: left and right.',
          'A binary search tree adds one rule: everything in the left subtree is smaller, everything in the right subtree is larger.',
        ],
        points: ['left < node < right', 'height h = levels from root to deepest leaf', 'each comparison discards a whole subtree'],
      },
      { type: 'task', text: 'Insert four new values and watch where each one lands.', hint: 'Try 20, 40, 60 and 80.', check: did('insert', 4) },
      { type: 'task', text: 'Search for a value that is in the tree.', hint: 'Every step goes left or right.', check: lastWas('search', (last) => last.result === true) },
      { type: 'task', text: 'Search for a value that is NOT in the tree.', hint: 'The search ends when it falls off a leaf.', check: lastWas('search', (last) => last.result === false) },
      {
        type: 'lesson',
        title: 'Fast - if the tree is bushy',
        text: [
          'Search, insert and delete cost O(h). In a well-shaped tree h is about log2(n), so a million values need only about 20 comparisons.',
          'But insert 1, 2, 3, 4, 5 in order and every node goes right: the tree becomes a list and h = n. Keep that in mind - the Tower of Balance fixes it.',
        ],
      },
      { type: 'quiz', question: 'In a BST, where are all values smaller than the root?', options: ['In the right subtree', 'In the left subtree', 'At the leaves', 'Anywhere'], answer: 1, explain: 'That is the BST rule.' },
      { type: 'quiz', question: 'What happens to a BST if you insert values in sorted order?', options: ['It stays balanced', 'It becomes a long chain, so operations become O(n)', 'It sorts them in reverse', 'Insertion fails'], answer: 1, explain: 'Each new value is the largest so far and goes right every time.' },
    ],
  },
  {
    id: 'tree-traversals',
    act: 'act-3',
    title: 'Paths Through the Forest',
    structure: 'bst',
    setup: [50, 30, 70, 20, 40, 60, 80].map((v) => ['insert', v]),
    reward: { xp: 120, badge: { name: 'Pathfinder', mark: 'T' } },
    steps: [
      {
        type: 'lesson',
        title: 'Four ways to walk a tree',
        text: [
          'Depth-first walks differ only in when you visit the node: pre-order (node, left, right), in-order (left, node, right) and post-order (left, right, node).',
          'Level-order visits the tree row by row with a queue. In-order on a BST always gives sorted output.',
        ],
        points: ['pre-order: copy a tree', 'in-order: sorted values', 'post-order: delete a tree safely', 'level-order: row by row'],
      },
      { type: 'task', text: 'Run an in-order traversal. Is the output sorted?', hint: 'Press In-order.', check: did('inorder') },
      { type: 'task', text: 'Run a pre-order or post-order traversal and compare.', hint: 'Either button counts.', check: ({ counts }) => (counts.preorder ?? 0) + (counts.postorder ?? 0) >= 1 },
      { type: 'task', text: 'Run a level-order traversal.', hint: 'Press Level-order.', check: did('levelorder') },
      {
        type: 'lesson',
        title: 'Pruning: deletion\'s three cases',
        text: [
          'Deleting a leaf: just cut it off. A node with one child: let the child take its place.',
          'A node with two children: copy in its in-order successor (the smallest value in its right subtree), then delete the successor, which has at most one child.',
        ],
      },
      { type: 'task', text: 'Delete the root, 50. It has two children.', hint: 'Use Delete with 50.', check: lastWas('delete', (last) => last.args[0] === 50 && last.result === true) },
      { type: 'quiz', question: 'Which traversal of a BST prints values in sorted order?', options: ['Pre-order', 'In-order', 'Post-order', 'Level-order'], answer: 1, explain: 'Left subtree (smaller), node, right subtree (larger).' },
      { type: 'quiz', question: 'Which helper structure does level-order traversal use?', options: ['A stack', 'A queue', 'A hash table', 'Nothing'], answer: 1, explain: 'Children wait in a queue, so each level is finished before the next starts.' },
      { type: 'quiz', question: 'When deleting a node with two children, what replaces it?', options: ['Its left child', 'The root', 'Its in-order successor', 'The largest leaf'], answer: 2, explain: 'The successor is the next larger value, so the BST rule still holds.' },
    ],
  },
  {
    id: 'heap',
    act: 'act-3',
    title: 'The Priority Beacon',
    structure: 'heap',
    setup: [5, 9, 3].map((v) => ['insert', v]),
    reward: { xp: 120, badge: { name: 'Beacon Lighter', mark: 'P' } },
    steps: [
      {
        type: 'lesson',
        title: 'Always know the smallest',
        text: [
          'The beacon must always signal the most urgent message. A min-heap keeps the smallest value at the root, with one rule: every parent is smaller than or equal to its children.',
          'A heap is a complete binary tree, so it fits perfectly in an array: the children of index i are 2i+1 and 2i+2, and its parent is (i-1)/2 rounded down.',
        ],
        points: ['root = minimum', 'stored in a plain array', 'children of i: 2i+1 and 2i+2'],
      },
      { type: 'task', text: 'Insert a value smaller than everything in the heap and watch it sift up to the root.', hint: 'Try 1.', check: ({ last, state }) => last?.op === 'insert' && last.result === true && state.values[0] === last.args[0] },
      { type: 'task', text: 'Extract the minimum twice. Watch the last item sink down.', hint: 'Press "Extract min" twice.', check: did('extractMin', 2) },
      { type: 'task', text: 'Peek at the new minimum.', hint: 'Press "Peek min".', check: did('peek') },
      { type: 'lesson', title: 'Priority queues everywhere', text: ['Heaps power priority queues: task schedulers, event simulations, Dijkstra\'s shortest-path algorithm and heap sort all rely on getting the minimum in O(1) and fixing the heap in O(log n).'] },
      { type: 'quiz', question: 'In an array-based heap, where are the children of index 3?', options: ['4 and 5', '6 and 7', '7 and 8', '1 and 2'], answer: 2, explain: '2 x 3 + 1 = 7 and 2 x 3 + 2 = 8.' },
      { type: 'quiz', question: 'What is the cost of removing the minimum from a heap of n items?', options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'], answer: 1, explain: 'The moved item sinks at most one level per step, and the tree has about log n levels.' },
    ],
  },
  {
    id: 'trie',
    act: 'act-3',
    title: 'The Whispering Words',
    structure: 'trie',
    setup: [],
    reward: { xp: 120, badge: { name: 'Word Weaver', mark: 'W' } },
    steps: [
      {
        type: 'lesson',
        title: 'Trees made of letters',
        text: [
          'The forest whispers words. A trie (from "retrieval") stores strings letter by letter: each edge is a character, and words that share a prefix share a path.',
          'A special marker shows where a complete word ends - otherwise "car" and "cart" could not be told apart.',
        ],
        points: ['one node per letter', 'shared prefixes share nodes', 'end markers for complete words'],
      },
      { type: 'task', text: 'Insert the words car, cart and cat.', hint: 'Insert each word separately.', check: ({ state }) => ['car', 'cart', 'cat'].every((word) => state.words.includes(word)) },
      { type: 'task', text: 'Search for "ca". The path exists - but is it a word?', hint: 'Use "Search word" with ca.', check: lastWas('search', (last) => last.args[0] === 'ca') },
      { type: 'task', text: 'Find every word that starts with "ca".', hint: 'Use "Starts with".', check: lastWas('startsWith', (last) => last.args[0] === 'ca') },
      { type: 'lesson', title: 'Autocomplete', text: ['Search and prefix lookups cost O(L), where L is the word length - independent of how many words are stored. That is why tries power autocomplete, spell checkers and IP routing tables.'] },
      { type: 'quiz', question: 'How long does looking up a word of length L take in a trie?', options: ['O(1)', 'O(L)', 'O(n)', 'O(n x L)'], answer: 1, explain: 'One step per letter, whatever the number of stored words.' },
      { type: 'quiz', question: 'Why does a trie need end-of-word markers?', options: ['To save memory', 'To tell stored words apart from mere prefixes', 'To sort the words', 'To count letters'], answer: 1, explain: 'Without them, inserting "cart" would make "car" look stored too.' },
    ],
  },
  {
    id: 'avl',
    act: 'act-4',
    title: 'The Tower of Balance',
    structure: 'avl',
    setup: [],
    reward: { xp: 160, badge: { name: 'Balancer', mark: 'V' } },
    steps: [
      {
        type: 'lesson',
        title: 'Keeping trees short',
        text: [
          'Remember the BST that turned into a chain? An AVL tree prevents it. Each node tracks its balance factor: height(left) - height(right).',
          'If a balance factor reaches +2 or -2 after an insert or delete, the tree rotates nodes around to restore balance. Height stays O(log n), always.',
        ],
        points: ['balance factor = h(left) - h(right)', 'allowed: -1, 0, +1', 'rotations restore balance'],
      },
      { type: 'task', text: 'Insert 10, then 20, then 30 - in that order. Watch the rotation.', hint: 'The third insert makes 10 right-heavy.', check: ({ state }) => [10, 20, 30].every((v) => state.values.includes(v)) && state.height <= 2 },
      {
        type: 'lesson',
        title: 'Four cases',
        text: [
          'Left-Left and Right-Right need a single rotation. Left-Right and Right-Left need two: first rotate the child, then the node.',
          'Rotations only change a few pointers, so each costs O(1), and the in-order sequence never changes.',
        ],
      },
      { type: 'task', text: 'Keep inserting increasing values until the tree has at least 8 nodes. Its height must stay small.', hint: '40, 50, 60, 70, 80...', check: ({ state }) => state.size >= 8 && state.height <= 4 },
      { type: 'task', text: 'Delete any value and watch the tree check its balance again.', hint: 'Use Delete.', check: lastWas('delete', (last) => last.result === true) },
      { type: 'quiz', question: 'A node has a left subtree of height 3 and a right subtree of height 1. What is its balance factor?', options: ['-2', '+2', '+4', '0'], answer: 1, explain: '3 - 1 = +2, so the node is left-heavy and must be rotated.' },
      { type: 'quiz', question: 'Which imbalance needs two rotations?', options: ['Left-Left', 'Right-Right', 'Left-Right', 'None of them'], answer: 2, explain: 'Left-Right (and Right-Left) first rotate the child to turn into a single-rotation case.' },
      { type: 'quiz', question: 'What is the worst-case search cost in an AVL tree with n nodes?', options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'], answer: 1, explain: 'The balance rule guarantees logarithmic height.' },
    ],
  },
  {
    id: 'graphs',
    act: 'act-4',
    title: 'The Map of Realms',
    structure: 'graph',
    setup: [
      ...[0, 1, 2, 3, 4, 5].map((v) => ['addVertex', v]),
      ['addEdge', 0, 1], ['addEdge', 0, 2], ['addEdge', 1, 3], ['addEdge', 2, 3], ['addEdge', 3, 4],
    ],
    reward: { xp: 160, badge: { name: 'Cartographer', mark: 'G' } },
    steps: [
      {
        type: 'lesson',
        title: 'Everything is connected',
        text: [
          'Realms are vertices; roads between them are edges. Graphs model maps, social networks, the web and dependencies between tasks.',
          'Here each vertex keeps an adjacency list of its neighbours. It uses O(V + E) memory, where V is the number of vertices and E the number of edges.',
        ],
        points: ['vertex = a thing, edge = a connection', 'adjacency list: each vertex lists its neighbours', 'trees are graphs without cycles'],
      },
      { type: 'task', text: 'Vertex 5 is isolated. Add an edge to connect it to the map.', hint: 'Try "Add edge" from 4 to 5.', check: lastWas('addEdge', (last) => last.result === true && last.args.includes(5)) },
      { type: 'task', text: 'Run breadth-first search from vertex 0.', hint: 'BFS uses a queue.', check: lastWas('bfs', (last) => last.args[0] === 0) },
      { type: 'task', text: 'Now run depth-first search from vertex 0 and compare the order.', hint: 'DFS uses a stack.', check: lastWas('dfs', (last) => last.args[0] === 0) },
      { type: 'lesson', title: 'Shortest paths', text: ['BFS explores in rings: all vertices 1 edge away, then 2, then 3. So the first time BFS reaches a vertex, it has found a path with the fewest edges. Weighted roads need Dijkstra\'s algorithm, which swaps the queue for a heap.'] },
      { type: 'task', text: 'Find the shortest path from 0 to 5.', hint: 'Use "Shortest path".', check: lastWas('shortestPath', (last) => Array.isArray(last.result)) },
      { type: 'quiz', question: 'Which structure does BFS use to decide what to visit next?', options: ['Stack', 'Queue', 'Heap', 'Trie'], answer: 1, explain: 'A queue keeps vertices in order of distance.' },
      { type: 'quiz', question: 'What is the time complexity of BFS with an adjacency list?', options: ['O(V)', 'O(E)', 'O(V + E)', 'O(V x E)'], answer: 2, explain: 'Every vertex is dequeued once and every edge is examined a constant number of times.' },
      { type: 'quiz', question: 'In an unweighted graph, which search finds the path with the fewest edges?', options: ['DFS', 'BFS', 'Both always', 'Neither'], answer: 1, explain: 'BFS reaches vertices in order of distance.' },
    ],
  },
  {
    id: 'union-find',
    act: 'act-4',
    title: 'The Alliance Council',
    structure: 'union-find',
    setup: [['makeSets', 8]],
    reward: { xp: 160, badge: { name: 'Diplomat', mark: 'U' } },
    steps: [
      {
        type: 'lesson',
        title: 'Who is allied with whom?',
        text: [
          'Eight houses sit at the council. Alliances merge over time, and the council keeps asking: are these two houses in the same alliance?',
          'Union-Find stores each alliance as a tree of parent pointers. The root is the representative. find(x) climbs to the root; union(a, b) joins two roots.',
        ],
        points: ['find(x) -> root of x\'s set', 'union(a, b) -> merge two sets', 'connected(a, b) -> same root?'],
      },
      { type: 'task', text: 'Form three alliances using Union.', hint: 'For example 0-1, 2-3, then 1-3.', check: did('union', 3) },
      {
        type: 'lesson',
        title: 'Two clever tricks',
        text: [
          'Union by rank hangs the shorter tree under the taller one, so trees stay flat. Path compression makes every node on a find path point straight at the root.',
          'Together they make each operation run in O(α(n)) amortised time, where α is the inverse Ackermann function - at most 4 for any input you will ever see.',
        ],
      },
      { type: 'task', text: 'Run Find on a node that is not a root and watch path compression.', hint: 'Pick a node with an arrow above it.', check: did('find') },
      { type: 'task', text: 'Ask whether two houses are connected.', hint: 'Use "Connected?".', check: did('connected') },
      { type: 'quiz', question: 'When are two elements in the same set?', options: ['When they are equal', 'When find returns the same root for both', 'When they are neighbours', 'When their ranks match'], answer: 1, explain: 'The root is the set\'s representative.' },
      { type: 'quiz', question: 'What does path compression do?', options: ['Deletes nodes', 'Points nodes on the find path directly at the root', 'Sorts the elements', 'Merges all sets'], answer: 1, explain: 'Later finds then take a single step.' },
      { type: 'quiz', question: 'Which algorithm uses Union-Find to build a minimum spanning tree?', options: ['Kruskal\'s algorithm', 'Binary search', 'Heap sort', 'DFS'], answer: 0, explain: 'Kruskal adds the cheapest edge that joins two different sets.' },
    ],
  },
  {
    id: 'final-trial',
    act: 'act-4',
    title: 'The Grand Trial',
    structure: null,
    setup: [],
    reward: { xp: 250, badge: { name: 'Grand Keeper', mark: '★' } },
    steps: [
      {
        type: 'lesson',
        title: 'The last door',
        text: [
          'Keeper, the Archive hums again. One test remains: knowing which structure to reach for. A real engineer does not memorise - they reason about which operations matter most.',
          'Read each scenario and choose the best fit.',
        ],
      },
      { type: 'quiz', question: 'You need to check, millions of times, whether a username is already taken.', options: ['Array with linear search', 'Hash set', 'Stack', 'Linked list'], answer: 1, explain: 'Membership checks in a hash set are O(1) on average.' },
      { type: 'quiz', question: 'An emergency room must always treat the most critical patient next.', options: ['Queue', 'Stack', 'Priority queue (heap)', 'Trie'], answer: 2, explain: 'A heap returns the highest-priority item in O(log n).' },
      { type: 'quiz', question: 'A search box should suggest words as the user types each letter.', options: ['Trie', 'Queue', 'Union-Find', 'Stack'], answer: 0, explain: 'Each typed letter moves one step down the prefix tree.' },
      { type: 'quiz', question: 'You need values kept in sorted order with fast insert, delete and search, even in the worst case.', options: ['Unsorted array', 'Balanced BST such as an AVL tree', 'Hash table', 'Queue'], answer: 1, explain: 'A balanced BST gives O(log n) for all three and in-order traversal is sorted.' },
      { type: 'quiz', question: 'Find the fewest number of flights between two cities.', options: ['DFS', 'BFS on a graph', 'Heap sort', 'Binary search'], answer: 1, explain: 'Flights are unweighted edges, and BFS finds fewest-edge paths.' },
      { type: 'quiz', question: 'A network keeps adding cables and asks whether two computers can reach each other.', options: ['Union-Find', 'Stack', 'Array', 'Trie'], answer: 0, explain: 'Each cable is a union; each question is a connected check, both near O(1).' },
      { type: 'quiz', question: 'A text editor needs unlimited undo.', options: ['Queue', 'Stack', 'Hash table', 'Graph'], answer: 1, explain: 'Undo reverses the most recent change first: LIFO.' },
      { type: 'quiz', question: 'You read item number i of a fixed-size list very often, and rarely insert.', options: ['Array', 'Linked list', 'Trie', 'Union-Find'], answer: 0, explain: 'Arrays give O(1) access by index.' },
    ],
  },
]);

export function findMission(id) {
  return MISSIONS.find((mission) => mission.id === id) ?? null;
}

export function missionsInAct(actId) {
  return MISSIONS.filter((mission) => mission.act === actId);
}

export function nextMission(id) {
  const index = MISSIONS.findIndex((mission) => mission.id === id);
  return index >= 0 ? MISSIONS[index + 1] ?? null : null;
}

/** Missions unlock in order: a mission is open once the one before it is completed. */
export function isUnlocked(id, isCompleted) {
  const index = MISSIONS.findIndex((mission) => mission.id === id);
  return index === 0 || (index > 0 && isCompleted(MISSIONS[index - 1].id));
}
