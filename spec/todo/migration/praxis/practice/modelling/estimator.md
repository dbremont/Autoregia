# Estimator

## Maximum Likelihood Estimator (MLE

### Exponential Distribution

**Model:** $X_1, \dots, X_n \sim \text{Exponential}(\lambda)$, with pdf

$$
f(x;\lambda) = \lambda e^{-\lambda x}, \quad x \ge 0
$$

**Task:** Derive the **Maximum Likelihood Estimator (MLE)** for $\lambda$. Compute the estimate given the sample: $x = [2.1, 0.5, 1.8, 3.2, 0.9]$.

###  Normal Distribution

**Model:** $X_1, \dots, X_n \sim \mathcal{N}(\mu, \sigma^2)$

**Task:** Estimate both $\mu$ and $\sigma^2$ using the **method of moments** and compare with the **MLE**. Use the sample: $x = [4.2, 3.8, 5.1, 4.9, 4.5]$.

### Poisson Distribution

**Model:** $X_1, \dots, X_n \sim \text{Poisson}(\lambda)$

$$
P(X=x) = \frac{\lambda^x e^{-\lambda}}{x!}, \quad x = 0,1,2,\dots
$$

**Task:** Find the **MLE** of $\lambda$. Evaluate it using the observed counts: $x = [3, 2, 4, 3, 5, 2]$.

### Uniform Distribution

**Model:** $X_1, \dots, X_n \sim \text{Uniform}(0, \theta)$

**Task:** Find the **MLE** for $\theta$. Compute the estimate for the sample: $x = [1.2, 0.7, 1.5, 0.9, 1.0]$. Discuss whether this estimator is biased or unbiased.

### Gamma Distribution

**Model:** $X_1, \dots, X_n \sim \text{Gamma}(\alpha, \beta)$, with pdf

$$
f(x;\alpha,\beta) = \frac{\beta^\alpha}{\Gamma(\alpha)} x^{\alpha-1} e^{-\beta x}, \quad x>0
$$

**Task:** Assume $\alpha$ is known. Derive the **MLE** for the rate parameter $\beta$. Compute it using: $x = [2.5, 3.1, 2.8, 3.3, 2.9]$, with $\alpha = 2$.

## Relative Efficiency

Let $X_1, X_2, \dots, X_n$ be independent and identically distributed (i.i.d.) random variables from a population with mean $\mu$ and variance $\sigma^2$. Consider the following estimators for $\mu$:

1. **Sample mean:**

$$
u_1 = \bar{X} = \frac{1}{n}\sum_{i=1}^n X_i
$$

2. **Weighted estimator:**

$$
u_2 = \frac{X_1}{3} + \frac{2}{3(n-1)} \sum_{i=2}^n X_i
$$

**Tasks:**

1. Compute the variance of $u_1$ and $u_2$.
2. Determine the **relative efficiency** of $u_1$ with respect to $u_2$, defined as

$$
\text{Eff}(u_1, u_2) = \frac{\mathrm{Var}(u_2)}{\mathrm{Var}(u_1)}.
$$

## **Sample Mean, Sample Variance, and Bias**

Let $X_1, X_2, \dots, X_n$ be i.i.d. random variables with mean $\mu$ and variance $\sigma^2$. Let

$$
\bar{X} = \frac{1}{n} \sum_{i=1}^n X_i
$$

be the **sample mean**.

**Questions**:

1. Compute the expected value of the sample mean, $\mathbb{E}[\bar{X}]$.
2. Determine the **bias** of $\bar{X}$ as an estimator of $\mu$. Is it unbiased?
3. Compute the variance of the sample mean, $\mathrm{Var}(\bar{X})$, in terms of $\sigma^2$ and $n$.
4. Compute the expected value of the sum of squared deviations from the sample mean:

$$
\mathbb{E}\Big[\sum_{i=1}^n (X_i - \bar{X})^2\Big]
$$

## Method of Moments Estimation

###  Bernoulli Distribution

Let $X_1, \dots, X_n$ be i.i.d. Bernoulli($p$) random variables.

1. Find the Method of Moments estimator $\hat{p}_{\text{MoM}}$ using the first moment.
2. Compute the expectation and variance of $\hat{p}_{\text{MoM}}$.

### Uniform Distribution

Let $X_1, \dots, X_n$ be i.i.d. $U(0, \theta)$.

1. Use the first moment to derive the MoM estimator for $\theta$.
2. Use the first two moments to derive an alternative MoM estimator.

### Exponential Distribution

Let $X_1, \dots, X_n$ be i.i.d. $ \text{Exp}(\lambda)$.

1. Find the MoM estimator for $\lambda$.
2. Compute $\mathbb{E}[\hat{\lambda}_{\text{MoM}}]$ and $\text{Var}(\hat{\lambda}_{\text{MoM}})$.

### **Problem 4: Gamma Distribution**

Let $X_1, \dots, X_n$ be i.i.d. Gamma($\alpha, \beta$) with unknown shape $\alpha$ and known rate $\beta = 1$.

1. Derive the MoM estimator for $\alpha$ using the first moment.
2. If both $\alpha$ and $\beta$ are unknown, use the first two moments to derive MoM estimators for both.
3. Discuss challenges in solving for multiple parameters using MoM.
