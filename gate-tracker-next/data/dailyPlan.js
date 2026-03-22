// ═══════════════════════════════════════════════════════════════════════════
// GATE CSE Daily Plan — Balanced Parallel Strategy
//
// KNOWN subjects (already touched):  Maths (LA/Calc/Prob), Digital Logic,
//                                     COA, DBMS, TOC
// UNKNOWN subjects (never touched):  Discrete, OS, Algorithms/DS, CN,
//                                     Compiler Design
//
// DAILY SLOT STRUCTURE:
//   slot1 = KNOWN subject — main lecture (2.5 hrs)
//   slot2 = Practice / PYQs for slot1 (2 hrs)
//   slot3 = UNKNOWN subject — new learning (1 hr)  ← parallel intake
//   slot4 = Foundation light — Discrete / Digital / Maths (1 hr)
//
// PAIRING LOGIC (alumni-backed connected subjects):
//   Maths (LA/Calc/Prob)  ↔  OS intro       (slot3) + Discrete (slot4)
//   Digital Logic          ↔  CN intro       (slot3) + Maths    (slot4)
//   COA                    ↔  OS             (slot3) + Digital  (slot4)
//   DBMS                   ↔  Algo / DS      (slot3) + Discrete (slot4)
//   TOC                    ↔  Compiler       (slot3) + Maths    (slot4)
// ═══════════════════════════════════════════════════════════════════════════

export const DAILY_PLAN = {

  // ══════════════════════════════════════════════════════════════════════════
  // MARCH (Mar 22–31)
  // slot1: Maths — Linear Algebra  |  slot3: OS intro  |  slot4: Discrete
  // ══════════════════════════════════════════════════════════════════════════
  '2026-03-22': {
    slot1: 'Maths → Systems of Linear Equations (row reduction, Gaussian elimination)',
    slot2: 'LA problems + PYQs',
    slot3: 'OS → What is an OS? Process concept, PCB intro',
    slot4: 'Discrete → Propositional Logic basics',
  },
  '2026-03-23': {
    slot1: 'Maths → Matrices & Determinants (properties, cofactors)',
    slot2: 'Matrix problems + PYQs',
    slot3: 'OS → Process States & Transitions (new, ready, running, waiting, terminated)',
    slot4: 'Discrete → Propositional Logic (tautology, equivalences)',
  },
  '2026-03-24': {
    slot1: 'Maths → Rank & Inverse (rank-nullity, LU decomposition)',
    slot2: 'Rank/Inverse problems + PYQs',
    slot3: 'OS → CPU Scheduling intro (FCFS, SJF concepts)',
    slot4: 'Discrete → Predicate / First-Order Logic',
  },
  '2026-03-25': {
    slot1: 'Maths → Eigenvalues & Eigenvectors (characteristic equation)',
    slot2: 'Eigenvalue problems + PYQs',
    slot3: 'OS → Scheduling algorithms (RR, Priority)',
    slot4: 'Discrete → Sets (operations, power set, Venn)',
  },
  '2026-03-26': {
    slot1: 'Maths → Eigenvalues continued (diagonalization)',
    slot2: 'Eigen PYQs heavy',
    slot3: 'OS → Scheduling numericals practice',
    slot4: 'Discrete → Relations (types, closures, equivalence)',
  },
  '2026-03-27': {
    slot1: 'Maths → Cayley-Hamilton theorem',
    slot2: 'Cayley-Hamilton problems + PYQs',
    slot3: 'OS → Threads & Concurrency intro',
    slot4: 'Discrete → Functions (injective, surjective, bijective)',
  },
  '2026-03-28': {
    slot1: 'Maths → Vector Spaces (subspaces, basis, dimension)',
    slot2: 'Vector Space problems + PYQs',
    slot3: 'OS → Process Synchronization intro (critical section, race condition)',
    slot4: 'Discrete → Partial Orders & Lattices',
  },
  '2026-03-29': {
    slot1: 'Maths → Linear Transformations',
    slot2: 'Linear Transformation problems + PYQs',
    slot3: 'OS → Semaphores & Mutex (producer-consumer problem)',
    slot4: 'Discrete → Monoids & Groups',
  },
  '2026-03-30': {
    slot1: 'Maths → Full LA revision + PYQs',
    slot2: 'LA PYQs heavy',
    slot3: 'OS → Deadlocks (conditions, prevention, avoidance)',
    slot4: 'Discrete → Graph Theory (connectivity, matching, coloring)',
  },
  '2026-03-31': {
    slot1: 'Maths → LA weak areas fix',
    slot2: 'Mixed LA PYQs',
    slot3: 'OS → Deadlock PYQs practice',
    slot4: 'Discrete → Combinatorics (counting, permutations, combinations)',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // APRIL Week 1 (Apr 1–7)
  // slot1: Maths — Calculus  |  slot3: OS memory  |  slot4: Discrete
  // ══════════════════════════════════════════════════════════════════════════
  '2026-04-01': {
    slot1: 'Maths → Limits & Continuity',
    slot2: 'Limits problems + PYQs',
    slot3: 'OS → Memory Management (contiguous allocation, fragmentation)',
    slot4: 'Discrete → Recurrence Relations & Generating Functions',
  },
  '2026-04-02': {
    slot1: 'Maths → Limits advanced + PYQs',
    slot2: 'Limits PYQs heavy',
    slot3: 'OS → Paging (page table, TLB, address translation)',
    slot4: 'Discrete → Full revision (Logic + Sets + Relations)',
  },
  '2026-04-03': {
    slot1: 'Maths → Differentiability',
    slot2: 'Differentiability problems + PYQs',
    slot3: 'OS → Paging numericals + PYQs',
    slot4: 'Discrete → Full revision (Graph Theory + Combinatorics)',
  },
  '2026-04-04': {
    slot1: 'Maths → Partial Derivatives',
    slot2: 'Partial Derivatives problems + PYQs',
    slot3: 'OS → Virtual Memory & Page Replacement (LRU, FIFO, Optimal)',
    slot4: 'Discrete → PYQs mixed',
  },
  '2026-04-05': {
    slot1: 'Maths → Maxima / Minima (single variable)',
    slot2: 'Maxima/Minima problems + PYQs',
    slot3: 'OS → Page Replacement PYQs heavy',
    slot4: 'Discrete → PYQs',
  },
  '2026-04-06': {
    slot1: 'Maths → Maxima / Minima (multivariable)',
    slot2: 'Multivariable problems + PYQs',
    slot3: 'OS → File Systems (allocation methods, directory structure)',
    slot4: 'Discrete → PYQs',
  },
  '2026-04-07': {
    slot1: 'Maths → Integration & Mean Value Theorem',
    slot2: 'Integration problems + PYQs',
    slot3: 'OS → I/O Systems & Disk Scheduling (FCFS, SSTF, SCAN)',
    slot4: 'Discrete → light revision',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // APRIL Week 2 (Apr 8–14)
  // slot1: Maths — Calculus revision + Probability  |  slot3: OS PYQs  |  slot4: Discrete
  // ══════════════════════════════════════════════════════════════════════════
  '2026-04-08': {
    slot1: 'Maths → Calculus full revision + PYQs',
    slot2: 'Calculus PYQs heavy',
    slot3: 'OS → Full OS revision (Scheduling + Sync + Memory)',
    slot4: 'Discrete → PYQs',
  },
  '2026-04-09': {
    slot1: 'Maths → Probability — Basic Probability (sample space, events)',
    slot2: 'Basic Probability problems + PYQs',
    slot3: 'OS → OS PYQs (Scheduling)',
    slot4: 'Discrete → PYQs',
  },
  '2026-04-10': {
    slot1: 'Maths → Probability — Conditional Probability',
    slot2: 'Conditional Probability problems + PYQs',
    slot3: 'OS → OS PYQs (Memory + Deadlock)',
    slot4: 'Discrete → PYQs',
  },
  '2026-04-11': {
    slot1: 'Maths → Probability — Bayes Theorem',
    slot2: 'Bayes problems + PYQs',
    slot3: 'OS → OS PYQs mixed heavy',
    slot4: 'Discrete → PYQs',
  },
  '2026-04-12': {
    slot1: 'Maths → Probability — Random Variables & Distributions',
    slot2: 'Distributions problems + PYQs',
    slot3: 'OS → Weak areas fix',
    slot4: 'Discrete → PYQs',
  },
  '2026-04-13': {
    slot1: 'Maths → Probability — Expectation, Variance, Mean, Median, Mode',
    slot2: 'Expectation/Variance PYQs heavy',
    slot3: 'OS → OS PYQs (File Systems + I/O)',
    slot4: 'Discrete → light',
  },
  '2026-04-14': {
    slot1: 'Maths → Full Probability revision + PYQs',
    slot2: 'Probability PYQs heavy',
    slot3: 'OS → Full OS PYQ revision',
    slot4: 'Discrete → PYQs',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // APRIL Week 3–4 (Apr 15–30)
  // slot1: Digital Logic  |  slot3: CN intro  |  slot4: Maths/Discrete
  // ══════════════════════════════════════════════════════════════════════════
  '2026-04-15': {
    slot1: 'Digital Logic → Number Systems & Codes (binary, hex, BCD, 2s complement)',
    slot2: 'Number System problems + PYQs',
    slot3: 'CN → Network Basics & OSI / TCP-IP Model',
    slot4: 'Maths → Probability revision',
  },
  '2026-04-16': {
    slot1: 'Digital Logic → Boolean Algebra (axioms, theorems, De Morgan)',
    slot2: 'Boolean Algebra problems + PYQs',
    slot3: 'CN → Physical Layer (transmission media, encoding, bandwidth)',
    slot4: 'Discrete → PYQs',
  },
  '2026-04-17': {
    slot1: 'Digital Logic → K-Maps & Minimization (SOP, POS)',
    slot2: 'K-Map problems + PYQs',
    slot3: 'CN → Data Link Layer (framing, error detection, flow control)',
    slot4: 'Maths → PYQs',
  },
  '2026-04-18': {
    slot1: 'Digital Logic → Combinational Circuits (MUX, Decoder, Encoder, Comparator)',
    slot2: 'Combinational Circuit problems + PYQs',
    slot3: 'CN → MAC Protocols (CSMA/CD, CSMA/CA, Aloha)',
    slot4: 'Discrete → PYQs',
  },
  '2026-04-19': {
    slot1: 'Digital Logic → Adders & Arithmetic Circuits',
    slot2: 'Adder problems + PYQs',
    slot3: 'CN → MAC PYQs + error detection numericals',
    slot4: 'Maths → PYQs',
  },
  '2026-04-20': {
    slot1: 'Digital Logic → Sequential Circuits (Flip-Flops, Counters, Registers)',
    slot2: 'Sequential Circuit problems + PYQs',
    slot3: 'CN → Network Layer (IP, subnetting, CIDR, NAT)',
    slot4: 'Discrete → PYQs',
  },
  '2026-04-21': {
    slot1: 'Digital Logic → Memory (ROM, RAM types)',
    slot2: 'Memory problems + PYQs',
    slot3: 'CN → Subnetting numericals + PYQs',
    slot4: 'Maths → PYQs',
  },
  '2026-04-22': {
    slot1: 'Digital Logic → Full revision + PYQs',
    slot2: 'Digital Logic PYQs heavy',
    slot3: 'CN → Routing Algorithms (RIP, OSPF, BGP, Dijkstra)',
    slot4: 'Discrete → PYQs',
  },
  '2026-04-23': {
    slot1: 'Digital Logic → Weak areas fix + PYQs',
    slot2: 'Mixed Digital PYQs',
    slot3: 'CN → Routing PYQs heavy',
    slot4: 'Maths → PYQs',
  },
  '2026-04-24': {
    slot1: 'Digital Logic → Full PYQ revision',
    slot2: 'Digital Logic PYQs heavy',
    slot3: 'CN → Transport Layer (TCP, UDP, connection setup)',
    slot4: 'Discrete → PYQs',
  },
  '2026-04-25': {
    slot1: 'Maths → Full Engineering Maths revision (LA + Calculus + Probability)',
    slot2: 'Mixed Maths PYQs',
    slot3: 'CN → Congestion Control & Flow Control (TCP sliding window)',
    slot4: 'Digital Logic → light revision',
  },
  '2026-04-26': {
    slot1: 'Maths → Maths PYQs heavy (all topics)',
    slot2: 'Mixed Maths PYQs',
    slot3: 'CN → Application Layer (HTTP, DNS, FTP, SMTP, DHCP)',
    slot4: 'Discrete → PYQs',
  },
  '2026-04-27': {
    slot1: 'Maths → Weak areas fix',
    slot2: 'Maths PYQs',
    slot3: 'CN → Full CN revision',
    slot4: 'Digital Logic → PYQs',
  },
  '2026-04-28': {
    slot1: 'Digital Logic → Mixed PYQs + revision',
    slot2: 'Digital Logic PYQs',
    slot3: 'CN → CN PYQs heavy',
    slot4: 'Maths → PYQs',
  },
  '2026-04-29': {
    slot1: 'Maths + Digital → Mixed PYQs',
    slot2: 'Mixed PYQs',
    slot3: 'CN → CN weak areas fix',
    slot4: 'Discrete → PYQs',
  },
  '2026-04-30': {
    slot1: 'Full revision — Maths + Digital + OS + CN',
    slot2: 'Mixed PYQs',
    slot3: 'CN → CN PYQ revision',
    slot4: 'Closure Day — light',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // MAY Week 1–2 (May 1–14)
  // slot1: COA  |  slot3: Algo/DS intro  |  slot4: Digital Logic / Maths
  // ══════════════════════════════════════════════════════════════════════════
  '2026-05-01': {
    slot1: 'COA → Machine Instructions & Addressing Modes',
    slot2: 'ISA problems + PYQs',
    slot3: 'Algo → Asymptotic Analysis (Big-O, Omega, Theta)',
    slot4: 'Digital Logic → revision',
  },
  '2026-05-02': {
    slot1: 'COA → ALU & Data Path',
    slot2: 'ALU problems + PYQs',
    slot3: 'Algo → Recurrences (Master theorem, substitution)',
    slot4: 'Maths → PYQs',
  },
  '2026-05-03': {
    slot1: 'COA → CPU Organization & Control Unit',
    slot2: 'CPU problems + PYQs',
    slot3: 'Algo → Divide & Conquer (merge sort, quick sort, binary search)',
    slot4: 'Digital Logic → PYQs',
  },
  '2026-05-04': {
    slot1: 'COA → Pipelining (stages, throughput, speedup)',
    slot2: 'Pipelining numericals + PYQs',
    slot3: 'Algo → Sorting algorithms (all + analysis)',
    slot4: 'Maths → PYQs',
  },
  '2026-05-05': {
    slot1: 'COA → Pipeline Hazards (structural, data, control)',
    slot2: 'Hazard problems + PYQs',
    slot3: 'DS → Arrays & Strings',
    slot4: 'Digital Logic → PYQs',
  },
  '2026-05-06': {
    slot1: 'COA → Cache Memory (mapping, replacement, write policies)',
    slot2: 'Cache numericals + PYQs',
    slot3: 'DS → Linked List (singly, doubly, circular)',
    slot4: 'Maths → PYQs',
  },
  '2026-05-07': {
    slot1: 'COA → Cache PYQs heavy',
    slot2: 'Mixed COA PYQs',
    slot3: 'DS → Stack & Queue (applications, infix/postfix)',
    slot4: 'Digital Logic → PYQs',
  },
  '2026-05-08': {
    slot1: 'COA → Memory Hierarchy & Virtual Memory',
    slot2: 'Memory problems + PYQs',
    slot3: 'DS → Searching & Hashing (linear, binary, hash tables)',
    slot4: 'Maths → PYQs',
  },
  '2026-05-09': {
    slot1: 'COA → I/O Interface (DMA, interrupts)',
    slot2: 'I/O problems + PYQs',
    slot3: 'DS → Trees (Binary Tree, traversals, properties)',
    slot4: 'Digital Logic → PYQs',
  },
  '2026-05-10': {
    slot1: 'COA → Full revision + PYQs',
    slot2: 'COA PYQs heavy',
    slot3: 'DS → BST & AVL Trees (rotations, height)',
    slot4: 'Maths → PYQs',
  },
  '2026-05-11': {
    slot1: 'COA → Weak areas fix + PYQs',
    slot2: 'Mixed COA PYQs',
    slot3: 'DS → Heaps & Priority Queue',
    slot4: 'Digital Logic → PYQs',
  },
  '2026-05-12': {
    slot1: 'COA → Full PYQ revision',
    slot2: 'COA PYQs heavy',
    slot3: 'Algo → Greedy Algorithms (activity selection, Huffman)',
    slot4: 'Maths → PYQs',
  },
  '2026-05-13': {
    slot1: 'COA → Mixed revision (Pipelining + Cache focus)',
    slot2: 'COA PYQs',
    slot3: 'Algo → Dynamic Programming (LCS, LIS, knapsack)',
    slot4: 'Digital Logic → PYQs',
  },
  '2026-05-14': {
    slot1: 'COA + Digital → Mixed PYQs revision',
    slot2: 'Mixed PYQs',
    slot3: 'Algo → DP PYQs heavy',
    slot4: 'Maths → PYQs',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // MAY Week 3–4 (May 15–31)
  // slot1: DBMS  |  slot3: Algo/DS graphs  |  slot4: Discrete / Maths
  // ══════════════════════════════════════════════════════════════════════════
  '2026-05-15': {
    slot1: 'DBMS → ER Model (entities, relationships, attributes, keys)',
    slot2: 'ER Model problems + PYQs',
    slot3: 'DS → Graphs (representation, BFS, DFS)',
    slot4: 'Discrete → PYQs',
  },
  '2026-05-16': {
    slot1: 'DBMS → Relational Model & Relational Algebra',
    slot2: 'Relational Algebra problems + PYQs',
    slot3: 'Algo → Shortest Path (Dijkstra, Bellman-Ford, Floyd-Warshall)',
    slot4: 'Maths → PYQs',
  },
  '2026-05-17': {
    slot1: 'DBMS → SQL (DDL, DML, joins, subqueries, aggregation)',
    slot2: 'SQL problems + PYQs',
    slot3: 'Algo → MST (Kruskal, Prim)',
    slot4: 'Discrete → PYQs',
  },
  '2026-05-18': {
    slot1: 'DBMS → SQL advanced (views, triggers, nested queries)',
    slot2: 'SQL advanced PYQs',
    slot3: 'Algo → Graph algorithms (topological sort, SCC)',
    slot4: 'Maths → PYQs',
  },
  '2026-05-19': {
    slot1: 'DBMS → Functional Dependencies (Armstrong axioms, closure)',
    slot2: 'FD problems + PYQs',
    slot3: 'Algo → Graph PYQs heavy',
    slot4: 'Discrete → PYQs',
  },
  '2026-05-20': {
    slot1: 'DBMS → Normalization (1NF, 2NF, 3NF, BCNF)',
    slot2: 'Normalization problems + PYQs',
    slot3: 'Algo + DS → Full revision',
    slot4: 'Maths → PYQs',
  },
  '2026-05-21': {
    slot1: 'DBMS → Normalization PYQs heavy',
    slot2: 'Mixed DBMS PYQs',
    slot3: 'Algo + DS → PYQs heavy',
    slot4: 'Discrete → PYQs',
  },
  '2026-05-22': {
    slot1: 'DBMS → Indexing & B/B+ Trees',
    slot2: 'Indexing problems + PYQs',
    slot3: 'Algo + DS → Weak areas fix',
    slot4: 'Maths → PYQs',
  },
  '2026-05-23': {
    slot1: 'DBMS → Transactions & ACID properties',
    slot2: 'Transaction problems + PYQs',
    slot3: 'Algo + DS → Full PYQ revision',
    slot4: 'Discrete → PYQs',
  },
  '2026-05-24': {
    slot1: 'DBMS → Concurrency Control (2PL, timestamp, locking)',
    slot2: 'Concurrency PYQs heavy',
    slot3: 'OS → OS PYQs revision (keep alive)',
    slot4: 'Maths → PYQs',
  },
  '2026-05-25': {
    slot1: 'DBMS → Recovery (log-based, checkpoints)',
    slot2: 'Recovery problems + PYQs',
    slot3: 'CN → CN PYQs revision (keep alive)',
    slot4: 'Discrete → PYQs',
  },
  '2026-05-26': {
    slot1: 'DBMS → Full revision + PYQs',
    slot2: 'DBMS PYQs heavy',
    slot3: 'Algo + DS → PYQs',
    slot4: 'Maths → PYQs',
  },
  '2026-05-27': {
    slot1: 'DBMS → Weak areas fix + PYQs',
    slot2: 'Mixed DBMS PYQs',
    slot3: 'OS + CN → mixed PYQs (keep alive)',
    slot4: 'Discrete → PYQs',
  },
  '2026-05-28': {
    slot1: 'DBMS → Full PYQ revision',
    slot2: 'DBMS PYQs heavy',
    slot3: 'Algo + DS → PYQs',
    slot4: 'Maths → PYQs',
  },
  '2026-05-29': {
    slot1: 'Full revision — COA + DBMS + Digital',
    slot2: 'Mixed PYQs',
    slot3: 'OS + CN → PYQs',
    slot4: 'Discrete → PYQs',
  },
  '2026-05-30': {
    slot1: 'Weak areas fix (all subjects so far)',
    slot2: 'Mixed PYQs',
    slot3: 'Algo + DS → PYQs',
    slot4: 'Maths → PYQs',
  },
  '2026-05-31': {
    slot1: 'Light revision + mental reset',
    slot2: '',
    slot3: '',
    slot4: 'Closure Day',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // JUNE (Jun 1–30)
  // slot1: TOC (known)  |  slot3: Compiler Design (unknown)  |  slot4: Maths/Digital
  // ══════════════════════════════════════════════════════════════════════════
  '2026-06-01': {
    slot1: 'TOC → DFA & NFA (construction, acceptance)',
    slot2: 'DFA/NFA problems + PYQs',
    slot3: 'Compiler → Phases & Overview (lexical, syntax, semantic, IR, codegen)',
    slot4: 'Maths → PYQs',
  },
  '2026-06-02': {
    slot1: 'TOC → NFA to DFA Conversion (subset construction)',
    slot2: 'NFA→DFA PYQs heavy',
    slot3: 'Compiler → Lexical Analysis (RE → NFA → DFA, tokens)',
    slot4: 'Digital Logic → PYQs',
  },
  '2026-06-03': {
    slot1: 'TOC → Regular Expressions (RE ↔ FA conversions)',
    slot2: 'RE problems + PYQs',
    slot3: 'Compiler → Parsing intro (top-down, bottom-up, FIRST & FOLLOW)',
    slot4: 'Maths → PYQs',
  },
  '2026-06-04': {
    slot1: 'TOC → DFA Minimization (Myhill-Nerode)',
    slot2: 'Minimization PYQs heavy',
    slot3: 'Compiler → LL(1) Parsing (predictive parsing table)',
    slot4: 'Digital Logic → PYQs',
  },
  '2026-06-05': {
    slot1: 'TOC → Pumping Lemma for Regular Languages',
    slot2: 'Pumping Lemma problems + PYQs',
    slot3: 'Compiler → LR / SLR / LALR Parsing',
    slot4: 'Maths → PYQs',
  },
  '2026-06-06': {
    slot1: 'TOC → Regular Languages full revision + PYQs',
    slot2: 'Regular Language PYQs heavy',
    slot3: 'Compiler → LR Parsing PYQs heavy',
    slot4: 'Digital Logic → PYQs',
  },
  '2026-06-07': {
    slot1: 'TOC → Context-Free Grammars (derivations, parse trees, ambiguity)',
    slot2: 'CFG problems + PYQs',
    slot3: 'Compiler → Syntax Directed Translation (SDT, S-attributed, L-attributed)',
    slot4: 'Maths → PYQs',
  },
  '2026-06-08': {
    slot1: 'TOC → CNF / GNF conversions',
    slot2: 'CNF/GNF PYQs heavy',
    slot3: 'Compiler → Intermediate Code Generation (3-address code, TAC)',
    slot4: 'Digital Logic → PYQs',
  },
  '2026-06-09': {
    slot1: 'TOC → Pushdown Automata (PDA construction)',
    slot2: 'PDA problems + PYQs',
    slot3: 'Compiler → Code Optimization (peephole, loop, DAG)',
    slot4: 'Maths → PYQs',
  },
  '2026-06-10': {
    slot1: 'TOC → Pumping Lemma for CFLs',
    slot2: 'CFL Pumping Lemma PYQs heavy',
    slot3: 'Compiler → Code Generation',
    slot4: 'Digital Logic → PYQs',
  },
  '2026-06-11': {
    slot1: 'TOC → Turing Machines (construction, variants)',
    slot2: 'TM problems + PYQs',
    slot3: 'Compiler → Full revision + PYQs',
    slot4: 'Maths → PYQs',
  },
  '2026-06-12': {
    slot1: 'TOC → Decidability & Undecidability (halting problem, Rice\'s theorem)',
    slot2: 'Decidability PYQs heavy',
    slot3: 'Compiler → Compiler PYQs heavy',
    slot4: 'Digital Logic → PYQs',
  },
  '2026-06-13': {
    slot1: 'TOC → Full revision + PYQs',
    slot2: 'TOC PYQs heavy',
    slot3: 'Compiler → Weak areas fix + PYQs',
    slot4: 'Maths → PYQs',
  },
  '2026-06-14': {
    slot1: 'TOC → Weak areas fix + PYQs',
    slot2: 'Mixed TOC PYQs',
    slot3: 'Compiler → Full PYQ revision',
    slot4: 'Digital Logic → PYQs',
  },
  '2026-06-15': {
    slot1: 'TOC → Full PYQ revision',
    slot2: 'TOC PYQs heavy',
    slot3: 'OS → OS PYQs revision (keep alive)',
    slot4: 'Maths → PYQs',
  },
  '2026-06-16': {
    slot1: 'DBMS → DBMS PYQs revision (keep alive)',
    slot2: 'DBMS PYQs',
    slot3: 'CN → CN PYQs revision (keep alive)',
    slot4: 'Digital Logic → PYQs',
  },
  '2026-06-17': {
    slot1: 'COA → COA PYQs revision (keep alive)',
    slot2: 'COA PYQs',
    slot3: 'Algo + DS → PYQs revision (keep alive)',
    slot4: 'Maths → PYQs',
  },
  '2026-06-18': {
    slot1: 'Maths → Full Maths PYQs revision',
    slot2: 'Maths PYQs heavy',
    slot3: 'Compiler → PYQs',
    slot4: 'Digital Logic → PYQs',
  },
  '2026-06-19': {
    slot1: 'Digital Logic → Full Digital PYQs revision',
    slot2: 'Digital PYQs heavy',
    slot3: 'TOC → PYQs',
    slot4: 'Maths → PYQs',
  },
  '2026-06-20': {
    slot1: 'Full revision — TOC + Compiler',
    slot2: 'Mixed PYQs',
    slot3: 'OS + CN → PYQs',
    slot4: 'Discrete → PYQs',
  },
  '2026-06-21': {
    slot1: 'Full revision — DBMS + Algo/DS',
    slot2: 'Mixed PYQs',
    slot3: 'Compiler → PYQs',
    slot4: 'Maths → PYQs',
  },
  '2026-06-22': {
    slot1: 'Full revision — COA + Digital',
    slot2: 'Mixed PYQs',
    slot3: 'TOC → PYQs',
    slot4: 'Digital Logic → PYQs',
  },
  '2026-06-23': {
    slot1: 'Mixed PYQs — all subjects',
    slot2: 'PYQs heavy',
    slot3: 'OS + CN → PYQs',
    slot4: 'Maths → PYQs',
  },
  '2026-06-24': {
    slot1: 'Weak areas fix (all subjects)',
    slot2: 'PYQs',
    slot3: 'Algo + DS → PYQs',
    slot4: 'Discrete → PYQs',
  },
  '2026-06-25': {
    slot1: 'Mixed PYQs — all subjects',
    slot2: 'PYQs heavy',
    slot3: 'Compiler → PYQs',
    slot4: 'Maths → PYQs',
  },
  '2026-06-26': {
    slot1: 'Weak areas fix',
    slot2: 'PYQs',
    slot3: 'TOC → PYQs',
    slot4: 'Digital Logic → PYQs',
  },
  '2026-06-27': {
    slot1: 'Full revision cycle',
    slot2: 'Mixed PYQs',
    slot3: 'OS + CN → PYQs',
    slot4: 'Maths → PYQs',
  },
  '2026-06-28': {
    slot1: 'Mixed PYQs — all subjects',
    slot2: 'PYQs',
    slot3: 'Algo + DS → PYQs',
    slot4: 'Discrete → PYQs',
  },
  '2026-06-29': {
    slot1: 'Weak areas fix',
    slot2: 'PYQs',
    slot3: 'Compiler → PYQs',
    slot4: 'Maths → PYQs',
  },
  '2026-06-30': {
    slot1: 'Light revision + mental reset',
    slot2: '',
    slot3: '',
    slot4: 'Closure Day',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // JULY (Jul 1–31) — Full Revision Cycles + Mock Prep
  // slot1: Revision subject  |  slot3: Paired subject PYQs  |  slot4: Foundation
  // ══════════════════════════════════════════════════════════════════════════
  '2026-07-01': { slot1: 'Maths → Full LA + Calculus revision + PYQs', slot2: 'Maths PYQs heavy', slot3: 'OS → PYQs', slot4: 'Discrete → PYQs' },
  '2026-07-02': { slot1: 'Maths → Probability revision + PYQs', slot2: 'Probability PYQs heavy', slot3: 'CN → PYQs', slot4: 'Digital Logic → PYQs' },
  '2026-07-03': { slot1: 'Digital Logic → Full revision + PYQs', slot2: 'Digital PYQs heavy', slot3: 'CN → PYQs', slot4: 'Maths → PYQs' },
  '2026-07-04': { slot1: 'COA → Full revision + PYQs', slot2: 'COA PYQs heavy', slot3: 'OS → PYQs', slot4: 'Digital Logic → PYQs' },
  '2026-07-05': { slot1: 'DBMS → Full revision + PYQs', slot2: 'DBMS PYQs heavy', slot3: 'Algo + DS → PYQs', slot4: 'Discrete → PYQs' },
  '2026-07-06': { slot1: 'TOC → Full revision + PYQs', slot2: 'TOC PYQs heavy', slot3: 'Compiler → PYQs', slot4: 'Maths → PYQs' },
  '2026-07-07': { slot1: 'OS → Full revision + PYQs', slot2: 'OS PYQs heavy', slot3: 'COA → PYQs', slot4: 'Digital Logic → PYQs' },
  '2026-07-08': { slot1: 'CN → Full revision + PYQs', slot2: 'CN PYQs heavy', slot3: 'Digital Logic → PYQs', slot4: 'Maths → PYQs' },
  '2026-07-09': { slot1: 'Algo + DS → Full revision + PYQs', slot2: 'Algo/DS PYQs heavy', slot3: 'DBMS → PYQs', slot4: 'Discrete → PYQs' },
  '2026-07-10': { slot1: 'Compiler → Full revision + PYQs', slot2: 'Compiler PYQs heavy', slot3: 'TOC → PYQs', slot4: 'Maths → PYQs' },
  '2026-07-11': { slot1: 'Discrete → Full revision + PYQs', slot2: 'Discrete PYQs heavy', slot3: 'Maths → PYQs', slot4: 'Digital Logic → PYQs' },
  '2026-07-12': { slot1: 'Maths → Weak areas fix + PYQs', slot2: 'Maths PYQs', slot3: 'OS → PYQs', slot4: 'Discrete → PYQs' },
  '2026-07-13': { slot1: 'COA → Weak areas fix + PYQs', slot2: 'COA PYQs', slot3: 'Algo + DS → PYQs', slot4: 'Digital Logic → PYQs' },
  '2026-07-14': { slot1: 'DBMS → Weak areas fix + PYQs', slot2: 'DBMS PYQs', slot3: 'CN → PYQs', slot4: 'Maths → PYQs' },
  '2026-07-15': { slot1: 'TOC → Weak areas fix + PYQs', slot2: 'TOC PYQs', slot3: 'Compiler → PYQs', slot4: 'Discrete → PYQs' },
  '2026-07-16': { slot1: 'OS → Weak areas fix + PYQs', slot2: 'OS PYQs', slot3: 'COA → PYQs', slot4: 'Digital Logic → PYQs' },
  '2026-07-17': { slot1: 'CN → Weak areas fix + PYQs', slot2: 'CN PYQs', slot3: 'Digital Logic → PYQs', slot4: 'Maths → PYQs' },
  '2026-07-18': { slot1: 'Algo + DS → Weak areas fix + PYQs', slot2: 'Algo/DS PYQs', slot3: 'DBMS → PYQs', slot4: 'Discrete → PYQs' },
  '2026-07-19': { slot1: 'Compiler → Weak areas fix + PYQs', slot2: 'Compiler PYQs', slot3: 'TOC → PYQs', slot4: 'Maths → PYQs' },
  '2026-07-20': { slot1: 'Mixed PYQs — all subjects', slot2: 'PYQs heavy', slot3: 'OS + CN → PYQs', slot4: 'Digital Logic → PYQs' },
  '2026-07-21': { slot1: 'Mixed PYQs — all subjects', slot2: 'PYQs heavy', slot3: 'Algo + DS → PYQs', slot4: 'Maths → PYQs' },
  '2026-07-22': { slot1: 'Maths → 2nd revision round', slot2: 'Maths PYQs', slot3: 'OS → PYQs', slot4: 'Discrete → PYQs' },
  '2026-07-23': { slot1: 'Digital Logic → 2nd revision round', slot2: 'Digital PYQs', slot3: 'CN → PYQs', slot4: 'Maths → PYQs' },
  '2026-07-24': { slot1: 'COA → 2nd revision round', slot2: 'COA PYQs', slot3: 'Algo + DS → PYQs', slot4: 'Digital Logic → PYQs' },
  '2026-07-25': { slot1: 'DBMS → 2nd revision round', slot2: 'DBMS PYQs', slot3: 'Compiler → PYQs', slot4: 'Discrete → PYQs' },
  '2026-07-26': { slot1: 'TOC → 2nd revision round', slot2: 'TOC PYQs', slot3: 'OS → PYQs', slot4: 'Maths → PYQs' },
  '2026-07-27': { slot1: 'OS → 2nd revision round', slot2: 'OS PYQs', slot3: 'COA → PYQs', slot4: 'Digital Logic → PYQs' },
  '2026-07-28': { slot1: 'CN → 2nd revision round', slot2: 'CN PYQs', slot3: 'DBMS → PYQs', slot4: 'Maths → PYQs' },
  '2026-07-29': { slot1: 'Algo + DS → 2nd revision round', slot2: 'Algo/DS PYQs', slot3: 'TOC → PYQs', slot4: 'Discrete → PYQs' },
  '2026-07-30': { slot1: 'Compiler → 2nd revision round', slot2: 'Compiler PYQs', slot3: 'CN → PYQs', slot4: 'Maths → PYQs' },
  '2026-07-31': { slot1: 'Light revision + mental reset', slot2: '', slot3: '', slot4: 'Closure Day' },

  // ══════════════════════════════════════════════════════════════════════════
  // AUGUST (Aug 1–31) — Mock Tests + Final Revision
  // ══════════════════════════════════════════════════════════════════════════
  '2026-08-01': { slot1: 'Maths → 3rd revision + PYQs', slot2: 'Maths PYQs', slot3: 'OS → PYQs', slot4: 'Discrete → PYQs' },
  '2026-08-02': { slot1: 'Digital Logic → 3rd revision + PYQs', slot2: 'Digital PYQs', slot3: 'CN → PYQs', slot4: 'Maths → PYQs' },
  '2026-08-03': { slot1: 'COA → 3rd revision + PYQs', slot2: 'COA PYQs', slot3: 'Algo + DS → PYQs', slot4: 'Digital Logic → PYQs' },
  '2026-08-04': { slot1: 'DBMS → 3rd revision + PYQs', slot2: 'DBMS PYQs', slot3: 'Compiler → PYQs', slot4: 'Discrete → PYQs' },
  '2026-08-05': { slot1: 'TOC → 3rd revision + PYQs', slot2: 'TOC PYQs', slot3: 'OS → PYQs', slot4: 'Maths → PYQs' },
  '2026-08-06': { slot1: 'OS → 3rd revision + PYQs', slot2: 'OS PYQs', slot3: 'COA → PYQs', slot4: 'Digital Logic → PYQs' },
  '2026-08-07': { slot1: 'CN → 3rd revision + PYQs', slot2: 'CN PYQs', slot3: 'DBMS → PYQs', slot4: 'Maths → PYQs' },
  '2026-08-08': { slot1: 'Algo + DS → 3rd revision + PYQs', slot2: 'Algo/DS PYQs', slot3: 'TOC → PYQs', slot4: 'Discrete → PYQs' },
  '2026-08-09': { slot1: 'Compiler → 3rd revision + PYQs', slot2: 'Compiler PYQs', slot3: 'CN → PYQs', slot4: 'Maths → PYQs' },
  '2026-08-10': { slot1: 'Discrete → 3rd revision + PYQs', slot2: 'Discrete PYQs', slot3: 'Maths → PYQs', slot4: 'Digital Logic → PYQs' },
  '2026-08-11': { slot1: 'Weak areas fix — all subjects', slot2: 'Mixed PYQs', slot3: 'OS + CN → PYQs', slot4: 'Maths → PYQs' },
  '2026-08-12': { slot1: 'Mixed PYQs — all subjects', slot2: 'PYQs heavy', slot3: 'Algo + DS → PYQs', slot4: 'Discrete → PYQs' },
  '2026-08-13': { slot1: 'Weak areas fix', slot2: 'PYQs', slot3: 'Compiler → PYQs', slot4: 'Maths → PYQs' },
  '2026-08-14': { slot1: 'Mixed PYQs — all subjects', slot2: 'PYQs heavy', slot3: 'TOC → PYQs', slot4: 'Digital Logic → PYQs' },
  '2026-08-15': { slot1: 'Mock Test 1 (full syllabus)', slot2: 'Mock Analysis + weak areas', slot3: '', slot4: '' },
  '2026-08-16': { slot1: 'Weak areas from Mock 1', slot2: 'PYQs', slot3: 'OS + CN → PYQs', slot4: 'Maths → PYQs' },
  '2026-08-17': { slot1: 'Revision — Maths + Discrete', slot2: 'PYQs', slot3: 'Algo + DS → PYQs', slot4: 'Digital Logic → PYQs' },
  '2026-08-18': { slot1: 'Revision — Digital + COA', slot2: 'PYQs', slot3: 'Compiler → PYQs', slot4: 'Maths → PYQs' },
  '2026-08-19': { slot1: 'Mock Test 2 (full syllabus)', slot2: 'Mock Analysis + weak areas', slot3: '', slot4: '' },
  '2026-08-20': { slot1: 'Weak areas from Mock 2', slot2: 'PYQs', slot3: 'TOC → PYQs', slot4: 'Discrete → PYQs' },
  '2026-08-21': { slot1: 'Revision — DBMS + Algo/DS', slot2: 'PYQs', slot3: 'OS → PYQs', slot4: 'Maths → PYQs' },
  '2026-08-22': { slot1: 'Revision — TOC + Compiler', slot2: 'PYQs', slot3: 'CN → PYQs', slot4: 'Digital Logic → PYQs' },
  '2026-08-23': { slot1: 'Revision — OS + CN', slot2: 'PYQs', slot3: 'DBMS → PYQs', slot4: 'Maths → PYQs' },
  '2026-08-24': { slot1: 'Mock Test 3 (full syllabus)', slot2: 'Mock Analysis + weak areas', slot3: '', slot4: '' },
  '2026-08-25': { slot1: 'Weak areas from Mock 3', slot2: 'PYQs', slot3: 'Algo + DS → PYQs', slot4: 'Discrete → PYQs' },
  '2026-08-26': { slot1: 'Mixed PYQs — all subjects', slot2: 'PYQs heavy', slot3: 'OS + CN → PYQs', slot4: 'Maths → PYQs' },
  '2026-08-27': { slot1: 'Weak areas fix', slot2: 'PYQs', slot3: 'Compiler → PYQs', slot4: 'Digital Logic → PYQs' },
  '2026-08-28': { slot1: 'Mixed PYQs — all subjects', slot2: 'PYQs heavy', slot3: 'TOC → PYQs', slot4: 'Maths → PYQs' },
  '2026-08-29': { slot1: 'Mock Test 4 (full syllabus)', slot2: 'Mock Analysis + weak areas', slot3: '', slot4: '' },
  '2026-08-30': { slot1: 'Weak areas from Mock 4', slot2: 'PYQs', slot3: 'OS + CN → PYQs', slot4: 'Discrete → PYQs' },
  '2026-08-31': { slot1: 'Light revision + mental reset', slot2: '', slot3: '', slot4: 'Closure Day' },
};
