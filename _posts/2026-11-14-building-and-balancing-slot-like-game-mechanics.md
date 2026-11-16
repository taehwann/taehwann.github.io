---
layout: post
title: Building and Balancing Slot-Like Game Mechanics
date: 2026-11-14
description: Build a line-based slot machine, balance its RTP, and explore probability, variance, and player bankrolls.
tags: probability game-design simulation javascript
categories: mathematics
giscus_comments: true
toc:
  beginning: true
---

<link rel="stylesheet" href="{{ '/assets/css/posts/slotmachine.css' | relative_url }}">

<div id="slotmachine-post" class="slotmachine-post" markdown="1" data-asset-root="{{ '/assets/img/posts/slotmachine/' | relative_url }}">

## 1. Introduction

Slot-like mechanics appear in many games, where symbols are drawn or spun into a grid and rewards are determined by matching patterns or paylines.

The basic idea is simple: generate symbols, check for winning combinations, and award a payout. But how do we actually implement such a system? How do we balance the probabilities and payouts? And how can we analyze its behavior mathematically?

In this post, we'll build a simple slot machine, explore the mathematics behind it, and see how we can use that understanding to balance the game. We'll also run simulations to compare our theoretical calculations with what happens in practice.

## 2. Building a Simple Slot Machine

Let's start with a simple slot machine.

We'll use five reels, three visible rows, and ten symbols labeled A through J. A spin costs one coin, and payouts are awarded according to five fixed paylines.

These rules give us a small enough system to analyze mathematically while still allowing us to experiment with different reel configurations.

### 2.1 Reels and Symbols

A _reel_ is a circular strip containing a sequence of symbols.

In our implementation, each reel contains 50 positions. When the player spins, the game randomly selects one stop on each reel.

The selected stop determines the middle visible symbol. The symbols immediately before and after that stop appear above and below it.

For example, the first ten positions of Reel 1 in our J-heavy configuration are:

`B B A H C C C I I I`

If the selected stop contains H, the visible symbols for that reel would be A, H, and C.

Because all three symbols come from the same strip, they are not independent random draws.

{% include slotmachine/reel.liquid %}

After selecting one stop on each of our five reels, we obtain a 3 × 5 grid.

### 2.2 Paylines and Paytable

We need to determine which combinations count as winning outcomes.

Our game uses five paylines: three horizontal lines and two zigzags.

{% include slotmachine/paylines.liquid %}

A payline wins when at least three identical symbols appear consecutively, starting from the leftmost reel.

For example:

| Combination | Result    |
| ----------- | --------- |
| A A A B C   | 3 A match |
| A A A A C   | 4 A match |
| A A A A A   | 5 A match |
| A B A A A   | No win    |

Only the longest matching sequence on a line pays. If all five symbols match, the player receives the five-symbol award, not the sum of the three-, four-, and five-symbol awards.

Multiple paylines can win during the same spin. Their payouts are added together.

Next, we need to decide how much each combination pays.

{% include slotmachine/paytable.liquid %}

All payouts are measured in coins, and one coin activates all five paylines.

The paytable tells us how much a winning combination is worth. It does not tell us how likely that combination is to appear.

That depends on the reels.

### 2.3 Implementing the Spin Logic

We can represent the slot machine using three pieces of data:

- **Reel strips:** Arrays containing the ordered symbols on each reel.
- **Paylines:** Arrays specifying which row to inspect on each reel.
- **Paytable:** A mapping from symbol and match length to payout.

Using zero-based row indices, our paylines can be represented as:

```javascript
const PAYLINES = [
  [1, 1, 1, 1, 1], // Middle
  [0, 0, 0, 0, 0], // Top
  [2, 2, 2, 2, 2], // Bottom
  [0, 1, 2, 1, 0], // Zigzag
  [2, 1, 0, 1, 2], // Zigzag
];
```

A spin consists of selecting five random stops, generating the visible grid, and evaluating all paylines.

Here's a simplified JavaScript implementation:

```javascript
function spin(reels, paytable, random = Math.random) {
  const stops = reels.map((reel) => Math.floor(random() * reel.length));

  const grid = Array.from({ length: 3 }, (_, row) =>
    reels.map((reel, r) => {
      const index = (stops[r] + row - 1 + reel.length) % reel.length;

      return reel[index];
    })
  );

  let payout = 0;

  for (const line of PAYLINES) {
    const symbol = grid[line[0]][0];
    let matches = 1;

    for (let r = 1; r < reels.length; r++) {
      if (grid[line[r]][r] !== symbol) break;
      matches++;
    }

    if (matches >= 3) {
      payout += paytable[symbol][matches - 3];
    }
  }

  return { grid, payout, net: payout - 1 };
}
```

Notice that we select only five random stops, even though the visible grid contains 15 symbols.

We also evaluate each payline independently and add its payout to the total.

These details will become important when calculating the expected return.

### 2.4 Interactive Demo

{% include slotmachine/demo.liquid %}

Try spinning the machine a few times.

The demo starts with 100 virtual coins, and each spin costs one coin.

There are two selectable reel configurations:

**J-heavy:** A configuration with relatively large numbers of the highest-paying symbol, J.

**A–D-heavy:** A configuration dominated by the four lowest-paying symbols.

Both use exactly the same paytable and gameplay rules. Only the reel strips differ.

Try both configurations. Pay attention to how often a winning combination appears and how large the payouts are.

We'll compare their behavior later.

## 3. Understanding the Mathematics

We have a working machine, but we still don't know how much it pays on average.

To calculate that, we need to understand how the reel strips determine the probability of each outcome.

### 3.1 Probability Distribution of Symbols

Each reel contains 50 positions, and every position is equally likely to be selected.

Let $$ S_r $$ be the selected stop on reel $$ r $$.

Then:

$$
P(S_r=j)=\frac{1}{50}
$$

With five independently sampled reels, there are:

$$
50^5=312,500,000
$$

equally likely combinations of reel stops.

However, the symbols themselves are not equally likely.

Suppose symbol J appears 10 times on Reel 1.

Its probability of appearing at a particular visible row is:

$$
P(J)=\frac{10}{50}=0.2
$$

<!-- prettier-ignore -->
In general, if symbol $$ s $$ appears $$ c_{r,s} $$ times on reel $$ r $$, its probability is:

$$
p_r(s)=\frac{c_{r,s}}{50}
$$

Now let's examine the actual symbol counts from our J-heavy configuration.

| Reel | Number of J | Probability of J |
| ---- | ----------: | ---------------: |
| 1    |          10 |             0.20 |
| 2    |           8 |             0.16 |
| 3    |          10 |             0.20 |
| 4    |          18 |             0.36 |
| 5    |          21 |             0.42 |

What is the probability of getting five J symbols on a particular payline?

Because the stops on different reels are independently selected, we multiply the probabilities:

$$
\begin{aligned}
P(5J)
&=0.20(0.16)(0.20)(0.36)(0.42)\\
&=0.00096768
\end{aligned}
$$

So the probability is approximately 0.0968%.

For exactly three matching J symbols, the first three reels must contain J, and the fourth must contain something else.

$$
P(\text{exactly }3J)
=p_1p_2p_3(1-p_4)
$$

Similarly:

$$
P(\text{exactly }4J)
=p_1p_2p_3p_4(1-p_5)
$$

And:

$$
P(5J)=p_1p_2p_3p_4p_5
$$

These calculations can be repeated for every symbol.

We now know the probability of each winning combination on one payline. The next step is to combine these probabilities with the paytable.

### 3.2 Expected Value

Consider two possible outcomes.

One pays 100 coins but happens rarely. Another pays three coins much more frequently.

Which contributes more to the game's average payout?

We need to consider both the reward and its probability.

This is the purpose of _expected value_.

<!-- prettier-ignore -->
Let $$ X_\ell $$ represent the payout on payline $$ \ell $$. Its expected value is:

$$
E[X_\ell]
=
\sum_{s=A}^{J}
\sum_{k=3}^{5}
a_{k,s}P(\text{exactly }k\text{ of }s)
$$

<!-- prettier-ignore -->
Here, $$ a_{k,s} $$ is the paytable award for matching $$ k $$ copies of symbol $$ s $$.

Let's calculate the contribution of symbol J in our J-heavy configuration.

| Matches | Probability | Award |
| ------- | ----------: | ----: |
| 3 J     |    0.004096 |    10 |
| 4 J     |  0.00133632 |    20 |
| 5 J     |  0.00096768 |   100 |

Therefore:

$$
\begin{aligned}
E[X_{\ell,J}]
&=10(0.004096)\\
&\quad+20(0.00133632)\\
&\quad+100(0.00096768)\\
&=0.1644544
\end{aligned}
$$

J alone contributes approximately 0.1645 coins to the expected payout of one line.

Repeating the calculation for all ten symbols gives:

$$
E[X_\ell]=0.1919998976
$$

We have five paylines, so the total spin payout is:

$$
X=X_1+X_2+X_3+X_4+X_5
$$

By the _linearity of expectation_:

$$
E[X]=\sum_{\ell=1}^{5}E[X_\ell]
$$

Since each payline has the same marginal symbol probabilities:

$$
\begin{aligned}
E[X]
&=5(0.1919998976)\\
&=0.959999488
\end{aligned}
$$

Notice that we can add the expected values even though the paylines are not independent.

This is a useful property of expectation that makes calculating the total average payout much simpler.

### 3.3 Return to Player (RTP)

Now we know the expected payout per spin.

To express it relative to the bet, we calculate _Return to Player_, or RTP:

$$
RTP=\frac{E[X]}{b}
$$

where $$ b $$ is the cost of one spin.

Our machine costs one coin per spin, so:

$$
RTP=0.959999488\approx96\%
$$

In other words, the machine returns approximately 0.96 coins per coin wagered, in expectation.

This does not mean that every 100 spins will return exactly 96 coins. Individual results may vary significantly.

RTP describes the long-run average of the payout distribution, not the outcome of a particular session.

Although our example uses coins, slot-like mechanics in other games may reward players with different currencies, resources, or items.

The same expected-value analysis can be applied to these rewards. However, calculating RTP as a percentage requires a consistent way to compare the value of the rewards with the cost of playing. For item-based rewards, this might involve assigning values to items or analyzing their expected quantities separately.

We now have a way to measure average return. Let's use it to balance our machine.

## 4. Balancing the Game

Suppose our target RTP is 96%.

How should we adjust the game to reach that value?

There are two main controls in our model.

**Reel composition** determines how frequently each symbol appears.

**Paytable values** determine how much each winning combination pays.

Both influence expected payout, but they do so in different ways.

### 4.1 A Worked Example: Balancing Toward 96% RTP

Rather than just describing the process, let's work through a concrete example.

We'll use the same five-reel structure as our playable machine. To create an initial, unbalanced configuration, we'll take the J-heavy reel strips, replace one J on Reel 1 with B, and temporarily reduce the five-J award from 100 to 90 coins.

This gives us a starting point with slightly fewer high-paying symbols and a lower maximum J award.

The following is a constructed balancing exercise based on our actual reel data, not a record of the original design process.

**Step 1 — Calculate the initial RTP**

Our starting configuration has the following counts for J:

| Reel | J Count |
| ---- | ------: |
| 1    |       9 |
| 2    |       8 |
| 3    |      10 |
| 4    |      18 |
| 5    |      21 |

The remaining symbol counts and the reel arrangements are identical to the J-heavy configuration, except that Reel 1 has one additional B in place of J.

The paytable remains the same as before, except for the five-J award:

| Combination | Initial Award |
| ----------- | ------------: |
| 3 J         |            10 |
| 4 J         |            20 |
| 5 J         |            90 |

Using the expected-value calculation from Section 3, the initial RTP is:

$$
RTP_{\text{initial}}\approx83.4807\%
$$

Our target is 96%, so the machine currently returns considerably less than we want.

How can we increase it?

**Step 2 — Adjust the reel composition**

Let's change one B on Reel 1 back to J.

That changes the symbol counts on the first reel:

| Symbol | Before | After |
| ------ | -----: | ----: |
| B      |      7 |     6 |
| J      |      9 |    10 |

The probability of J appearing on the first reel increases from:

$$
\frac{9}{50}=0.18
$$

to:

$$
\frac{10}{50}=0.20
$$

This increases the probabilities of three-, four-, and five-J matches.

It also reduces the probability of B on Reel 1, so we must recalculate the expected payout of the entire machine rather than considering J alone.

After the adjustment, the theoretical RTP becomes:

$$
RTP_{\text{step 2}}\approx91.1615\%
$$

By changing just one symbol on one reel, we've increased the RTP by approximately 7.68 percentage points.

We're closer to our target, but the return is still too low.

**Step 3 — Adjust the paytable**

Now let's keep the reel strips fixed and adjust the payout for five matching J symbols.

Currently, five J symbols pay 90 coins. Suppose we increase that award to 100.

Unlike changing the reel composition, this does not change the probability of any outcome. It changes only the amount awarded when five J symbols appear.

For our current reels:

$$
P(5J)=0.00096768
$$

The increase in expected payout on one payline is:

$$
\Delta E[X_\ell]
=10(0.00096768)
=0.0096768
$$

Since we have five paylines:

$$
\Delta E[X]
=5(0.0096768)
=0.048384
$$

With a one-coin bet, this increases RTP by 4.8384 percentage points.

Our new RTP is:

$$
\begin{aligned}
RTP_{\text{final}}
&=91.1615488\%+4.8384\%\\
&=95.9999488\%
\end{aligned}
$$

We've reached our target to within approximately 0.000051 percentage points.

{% include slotmachine/balancing.liquid %}

| Stage                 | Adjustment                       |    RTP |
| --------------------- | -------------------------------- | -----: |
| Initial configuration | 9 J on Reel 1; five-J award = 90 | 83.48% |
| Reel adjustment       | Replace one B with J             | 91.16% |
| Paytable adjustment   | Increase five-J award to 100     | 96.00% |

The final configuration is exactly the J-heavy setup used in our interactive demo.

This example shows two different ways of changing RTP.

Changing a symbol's frequency affects several winning probabilities at once. Changing a paytable award modifies the reward associated with a particular outcome, while leaving its probability unchanged.

Both can be useful during balancing.

It also helps to automate these calculations, because manually recalculating every combination after each adjustment would quickly become tedious.

For our five-reel machine, we can write a function that calculates RTP directly from the reel strips and paytable:

```javascript
function calculateRTP(reels, paytable, bet = 1) {
  let expectedPerLine = 0;

  for (const symbol of Object.keys(paytable)) {
    const p = reels.map((reel) => reel.filter((s) => s === symbol).length / reel.length);

    const p3 = p[0] * p[1] * p[2] * (1 - p[3]);

    const p4 = p[0] * p[1] * p[2] * p[3] * (1 - p[4]);

    const p5 = p[0] * p[1] * p[2] * p[3] * p[4];

    expectedPerLine += paytable[symbol][0] * p3 + paytable[symbol][1] * p4 + paytable[symbol][2] * p5;
  }

  return (expectedPerLine * PAYLINES.length) / bet;
}
```

This function calculates the theoretical RTP for our model without running a simulation.

We can use it to test different reel compositions and paytables, immediately see the effect of our changes, and repeat the process until we reach the desired target.

However, matching a target RTP does not necessarily mean we're finished.

### 4.2 Same RTP, Different Gameplay

Let's compare our two original reel configurations.

The J-heavy configuration contains relatively large numbers of J symbols, while the A–D-heavy configuration is dominated by the lower-paying symbols.

For example, here is the distribution of J across their reels:

| Reel | J-heavy | A–D-heavy |
| ---- | ------: | --------: |
| 1    |      10 |         1 |
| 2    |       8 |         1 |
| 3    |      10 |         1 |
| 4    |      18 |         2 |
| 5    |      21 |         1 |

The A–D-heavy configuration has fewer J symbols but far more opportunities to match the lower-paying symbols.

Let's compare their calculated results.

| Measure                                      |    J-heavy |  A–D-heavy |
| -------------------------------------------- | ---------: | ---------: |
| Expected payout per spin                     | 0.95999949 | 0.95999994 |
| RTP                                          | 95.999949% | 95.999994% |
| Probability of winning on one specified line |    1.1672% |    4.3816% |

Both configurations have almost exactly 96% RTP.

Yet a particular payline wins much more frequently in the A–D-heavy configuration.

The difference becomes even clearer if we examine how much J contributes to expected payout.

In J-heavy, J contributes approximately 0.16445 coins per line.

In A–D-heavy, it contributes only about 0.0000837 coins per line.

The two systems reach almost identical expected payouts through very different reward distributions.

One concentrates much of its expected return in the highest-paying symbol. The other relies primarily on more frequent matches of the lower-paying symbols.

If we balance only for RTP, we wouldn't see this distinction.

We need another measure.

### 4.3 Variance and Volatility

RTP tells us how much a game returns on average, but it doesn't describe how individual payouts are distributed.

This is where _variance_ becomes useful.

Variance measures how widely outcomes are spread around their expected value. Since each spin produces a random payout, variance allows us to measure how much those payouts fluctuate rather than looking only at their average.

Mathematically:

$$
\operatorname{Var}(X)
=
E[(X-E[X])^2]
=
E[X^2]-E[X]^2
$$

A larger variance means that payouts are more widely spread around the expected value. Squaring the differences also makes unusually large payouts contribute strongly to variance.

Let's compare our two configurations.

| Measure         |  J-heavy | A–D-heavy |
| --------------- | -------: | --------: |
| Expected payout |   0.9600 |    0.9600 |
| Payout variance | 192.1904 |    9.2403 |

{% include slotmachine/variance.liquid %}

Despite having almost identical RTP, the J-heavy configuration has approximately **20.8 times the payout variance**.

Why is the difference so large?

In the J-heavy configuration, a significant portion of the expected return comes from relatively rare, high-paying combinations. Most spins return little or nothing, while occasional large payouts are much farther from the average.

In contrast, the A–D-heavy configuration distributes more of its expected return across frequent, smaller payouts. Its outcomes are less widely spread.

This difference is commonly described as _volatility_ in slot-machine design.

For these two configurations:

- **High volatility (J-heavy):** Less frequent winning lines, with more of the expected return concentrated in large rewards.
- **Low volatility (A–D-heavy):** More frequent winning lines, with more of the expected return distributed across smaller rewards.

The relationship comes from how we've designed the payout distributions. To maintain approximately the same expected return, the J-heavy configuration relies more on large awards occurring with lower probability, while the A–D-heavy configuration relies more on smaller awards occurring frequently.

This has a significant impact on how players experience the game.

A player might experience long stretches without meaningful rewards in a high-volatility game, followed by a large win. In a lower-volatility game, smaller but more frequent wins can provide a steadier sense of progression.

Even though the mathematical average is almost identical, the frequency and size of rewards can make the gameplay feel very different.

Of course, variance is not the only factor influencing player experience, but it is an important consideration when balancing slot-like mechanics.

### 4.4 Does Reel Arrangement Affect RTP?

One last detail: what happens if we rearrange the symbols on a reel without changing how many times each symbol appears?

The RTP stays the same.

Since every reel stop is equally likely, changing the order of symbols does not change their individual probabilities on a specified payline.

Therefore, as long as the symbol counts, paytable, and paylines remain unchanged, the theoretical RTP remains unchanged as well.

## 5. Testing with Simulations

We've calculated the theoretical RTP and variance of our two configurations.

Now let's see how they behave when we simulate a large number of spins.

We'll use Monte Carlo simulation, repeatedly generating random outcomes and recording the resulting payouts.

We'll compare experiments using **1,000,000 and 10,000,000 spins** to see how the observed results behave as the sample size increases.

### 5.1 Theoretical vs. Observed RTP

Our theoretical RTP is calculated directly from the probabilities and paytable.

Observed RTP, on the other hand, is calculated from the results of actual spins.

The calculation is simple:

$$
\text{Observed RTP}
=
\frac{\text{Total Coins Returned}}
{\text{Total Coins Bet}}
\times100\%
$$

For example, suppose we run 1,000,000 spins at one coin per spin.

If the total payout is 950,000 coins, the observed RTP is 95%.

If the total payout is 980,000 coins, the observed RTP is 98%.

Both are possible outcomes of a machine with a theoretical RTP of approximately 96%.

Let's run the experiment using both configurations.

{% include slotmachine/simulation.liquid %}

Try running the experiment multiple times.

You'll notice that the observed RTP doesn't follow the same path every time.

Sometimes a large payout causes a sudden increase. At other times, the observed RTP stays below the theoretical value for a while.

As the number of spins increases, the observed RTP tends to approach the theoretical RTP. This is explained by the _law of large numbers_.

But the two configurations don't necessarily approach that value in the same way.

Remember that J-heavy has a much larger payout variance.

Because its returns depend more heavily on relatively rare large payouts, the observed RTP can fluctuate substantially depending on whether those outcomes appear more or less often than expected in a particular simulation.

The A–D-heavy configuration generally produces less dramatic fluctuations because its payouts are more concentrated around smaller values.

Running more spins reduces the influence of individual outcomes on the overall average, but it doesn't guarantee that the observed RTP will exactly match the theoretical value.

This is why variance matters when interpreting simulation results.

A large sample is useful, but understanding the underlying payout distribution is equally important.

### 5.2 What Happens to a Player's Balance?

Our first experiment examined average returns over a fixed number of spins.

But what happens during an individual player's session?

Let's give the player 1,000 coins and simulate spins until the balance reaches zero or the selected spin limit is reached.

Let $$ B_n $$ represent the balance after $$ n $$ spins.

The balance updates according to:

$$
B_{n+1}=B_n-1+X_{n+1}
$$

<!-- prettier-ignore -->
where $$ X_{n+1} $$ is the payout of the next spin.

{% include slotmachine/bankroll.liquid %}

Run the experiment several times.

In the J-heavy configuration, the balance may decrease for an extended period before a large payout causes a sudden increase.

The A–D-heavy configuration generally produces smaller, more frequent rewards, which can result in a less dramatic bankroll trajectory.

However, these are tendencies, not guarantees. Either configuration can produce very different results across independent sessions.

Even though both machines have approximately the same RTP, their payout distributions affect how an individual session unfolds.

This is particularly relevant when designing games where players have limited resources.

A system with frequent small rewards may feel very different from one that offers rare large rewards, even if their average returns are identical.

Also, one simulated session is only one possible outcome. To estimate how often players run out of resources before a particular number of spins, we would need to run many independent sessions and examine the results.

## 6. Conclusion

We started by building a simple slot machine with five reels, five paylines, and a paytable.

We then explored how reel composition determines winning probabilities, how those probabilities can be used to calculate expected value and RTP, and how changing symbol frequencies or payouts affects the balance.

In our balancing example, we started with an 83.48% RTP configuration and reached approximately 96% by changing one symbol on a reel and adjusting a single paytable award.

However, matching the target RTP was only part of the problem.

Our two final configurations had nearly identical expected returns, yet their payout variances differed by more than a factor of 20.

That difference affects how frequently players receive rewards, how large those rewards tend to be, and how the game feels during an individual session.

Finally, we used simulations to compare the mathematical model with sampled outcomes and observe how different payout distributions behave over time.

The main lesson is that **RTP tells us how much a game returns on average, while variance helps us understand how those rewards are distributed**.

When designing slot-like mechanics, both are useful. The goal isn't simply to reach a particular RTP, but to understand how the probabilities and payouts shape the gameplay experience.

---

All coins used in the demo are virtual.

This post and its interactive demo are for educational purposes.

</div>

<script defer src="{{ '/assets/js/posts/slotmachine/data.js' | relative_url }}"></script>
<script defer src="{{ '/assets/js/posts/slotmachine/engine.js' | relative_url }}"></script>
<script defer src="{{ '/assets/js/posts/slotmachine/app.js' | relative_url }}"></script>
