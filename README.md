# Guandan-Make-Hand
The Guandan Master Evaluator v5.5 is a high-performance strategic analysis tool designed for Guandan (掼蛋), the popular Chinese competitive trick-taking card game.<br>
Built with a sophisticated heuristic engine and a modern React interface, this application automates the complex "hand organization" phase, helping players identify the most efficient way to group their 27 cards (dealt from two 54-card decks) into winning combinations.<br>
📜 Program Overview<br>
In Guandan, the quality of a hand is not just about the cards you hold, but how you arrange them. A single hand can be partitioned into dozens of different configurations of Bombs, Straights, Tubes, and Plates. This program uses a recursive branch-and-search algorithm to evaluate thousands of possibilities and present the top 5 most strategically sound arrangements.<br>
🚀 Key Features<br>
Intelligent AI Strategy Engine: Automatically detects complex patterns including Straight Flushes, Super Bombs (Four Kings), and Wild Card (Magic Heart) integrations.<br>
Professional Scoring Heuristics: Calculates a "Battle Power" score based on:<br>
Firepower: Number and strength of bombs.<br>
Efficiency: Reducing the total number of "turns" needed to clear the hand.<br>
Card Control: Evaluation of high-ranking singles and pairs.<br>
Penalty Logic: Deductions for weak "orphaned" cards (low-rank singles/pairs).<br>
Manual Sandbox Mode: Take full control! Manually group your cards and get real-time scoring feedback to compare your intuition against the AI.<br>
Advanced Data Management:<br>
String Import: Copy/paste a simple encoded string to replicate real-world hands.<br>
Save/Load: Export your best strategies as .txt files for later study or sharing.<br>
Dynamic UI/UX: A responsive, dark-themed dashboard featuring "Master Green" aesthetics, specialized card rendering, and a toggleable "Strategy Map" to keep the interface clean during focus sessions.<br>
🛠 How to Use<br>
Set the Level Rank: Select the current "Rank Card" (打几) to calibrate the Wild Card (Magic Heart) and point values.<br>
Deal or Import: Click "Redeal" for a random simulation, or use "String Import" to analyze a specific hand.<br>
Analyze: Click the "Show" button next to Best Tactical Map to reveal the AI's top 5 recommended arrangements.<br>
Compare: Toggle between AI suggestions to see how the scoring breakdown changes, or use the "Manual Grouping" tool to test your own theories.<br>
Whether you are a casual player looking to understand the basics or a competitive enthusiast aiming for mathematical perfection, Guandan Master provides the data-driven insights needed to dominate the table.<br>
