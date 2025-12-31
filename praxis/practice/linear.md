- What is an estimator?
- How to think about linear regression? What are the limits of **linear regression**?
- How to evaluate and select an estimator?
- Which are the estimator for linear regression?
- **Fundamentals & Formulation**
    - What assumptions underlie the classical linear regression model? Why are they important?
    - What is the Gauss-Markov theorem, and what are its implications for the OLS estimator?
    - How do you formally derive the OLS estimator using calculus and matrix algebra?
    - Under what conditions is the OLS estimator unbiased, consistent, and efficient?
    - What happens if the error terms are heteroscedastic or autocorrelated?
    - How do the estimators change if you drop the assumption of fixed regressors (i.e., regressors are stochastic)?
    - Why is linear regression still valid even when the regressors are not normally distributed?
- Estimation Theory
    - What are the differences between OLS, GLS, WLS, and ML estimators in linear models?
    - How does maximum likelihood estimation work for linear regression under normal errors?
    - What is the sampling distribution of the OLS estimator? Under which conditions is it exact?
    - What is the role of the hat matrix in linear regression? How does it relate to leverage and influence?
- Diagnostics & Validity
    - How do you test for multicollinearity? What are its effects on inference?
    - How do you detect heteroscedasticity? How does it affect inference?
    - What are Cook's Distance and DFBETAS? How are they derived and interpreted?
    - What are the implications of omitted variable bias? How is it derived analytically?
- Geometry of Linear Regression
    - What is the geometric interpretation of the least squares solution?
    - Why is the residual vector orthogonal to the space spanned by the regressors?
    - How do projections and orthogonality explain the properties of OLS?
    - What is the role of QR decomposition in solving the linear regression problem?
- Model Specification & Selection
    - What are the implications of model misspecification (wrong functional form, omitted variables, etc.)?
    - How do you compare nested and non-nested models? What tests apply?
    - What is the bias-variance trade-off in linear regression?
    - How is regularization (Ridge, Lasso) related to classical linear regression?
- Inference
    - How do you derive the F-test and t-tests for hypotheses in linear regression?
    - What are the assumptions and limitations of using confidence intervals in linear models?
    - What does it mean to test linear restrictions on coefficients? How do you compute these tests?
    - What is the difference between pointwise and simultaneous inference?
- Theoretical Extensions
    - In what sense is OLS the best linear unbiased estimator (BLUE)? What happens outside linearity?
    - How do you generalize linear regression to generalized linear models (GLMs)?
    - What is the connection between OLS and projection in Hilbert spaces?
    - How does OLS relate to empirical risk minimization?
- Numerical & Computational Aspects
    - What numerical methods are used to compute OLS in large datasets? How do they compare?
    - How do floating-point errors affect the stability of regression estimates?
    - What is the role of condition no de la expedición submarina y encontraron una estrella de mar deprimidaumber in diagnosing numerical stability?
    - How does stochastic gradient descent apply to linear regression, and when is it preferable?
- Causal Interpretation
    - Under what assumptions can OLS estimates be given a causal interpretation?
    - What is the relationship between linear regression and the potential outcomes framework?
    - How do instrumental variables relate to linear regression and when are they required?
    - What is the role of the back-door criterion in selecting variables for causal OLS models?
- Applications & Limitations
    - When does linear regression fail as a model? What are good examples of its misapplication?
    - How do linear regression coefficients behave in the presence of outliers or adversarial data?
    - What are the limits of interpretability in high-dimensional linear regression?
    - What are the assumptions behind using log-linear or interaction models within the linear regression framework?


## Problems

### **Education** – Student Dropout Risk

**Problem**: You're given a dataset of university students with features like attendance rate, GPA, parental education level, and number of failed courses.
**Task**: Use linear regression to predict the probability of a student dropping out before graduation.

### **Healthcare** – Predicting Blood Pressure

**Problem**: A clinic collected data on patients, including their age, weight, salt intake (grams/day), and physical activity level (hours/week).
**Task**: Build a linear regression model to estimate a patient’s systolic blood pressure.

### **Real Estate** – House Price Estimation

**Problem**: You’re given data on houses, including square footage, number of bedrooms, age of the house, and distance to city center.
**Task**: Train a linear model to predict the market price of a house.

### **Marketing** – Advertising and Sales

**Problem**: A company advertises through TV, radio, and newspapers. You have the ad spend in each channel and the resulting product sales.
**Task**: Use multiple linear regression to model the relationship between ad spending and product sales.

### **Agriculture** – Crop Yield Prediction

**Problem**: For a region’s farms, data includes average monthly rainfall, fertilizer used per hectare, and hours of sunshine.
**Task**: Build a model to predict wheat yield (tons per hectare).

### **Transportation** – Commute Time Estimation

**Problem**: A city monitors commute time (in minutes) along with distance (km), number of traffic lights, and time of day.
**Task**: Use linear regression to estimate commute time based on these features.

### **Finance** – Credit Risk Scoring

**Problem**: A financial institution records applicant income, debt-to-income ratio, and credit history length.
**Task**: Predict a simplified credit risk score (continuous value) using linear regression.

### **Energy** – Predicting Electricity Usage

**Problem**: You’re given household electricity consumption data along with outside temperature, number of occupants, and time of year.
**Task**: Build a model to predict daily energy usage (kWh).

### **Environmental Science** – Air Pollution Levels

**Problem**: A city tracks air quality index (AQI) along with data on industrial activity, humidity, and wind speed.
**Task**: Use linear regression to predict AQI values from the environmental factors.

### **Sports Analytics** – Basketball Player Performance

**Problem**: For each player, you have minutes played per game, field goal attempts, and number of assists.
**Task**: Predict the player’s points per game using linear regression.



## References

- https://02323.compute.dtu.dk/enotes/solutions-chapter5.pdf
- https://mitocw.ups.edu.ec/courses/sloan-school-of-management/15-071-the-analytics-edge-spring-2017/linear-regression/assignment-2/state-data/
- https://ocw.mit.edu/courses/18-05-introduction-to-probability-and-statistics-spring-2022/mit18_05_s22_class26-prep.pdf