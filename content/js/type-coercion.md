---
title: "Type Coercion"
date: 2022-07-21T19:49:37-05:00
draft: true
---

In Javascript, variables are not restricted to a certain datatype. Instead, a variable containing an integer can later be reassigned to the value of a string. This feature, in most cases, goes unnoticed or unappreciated by most programmers. In fact, many programmers see type coercion as a downside due to its inconsistencies.

In this post, I will not discuss whether type coercion is a positive or a negative feature. Instead, I will be exploring the clever/magical/terrible uses for it.

Below are some conversions, which will convert given values match the name of the given variable.
```js
const True = [!![], !!{}. !'', !"", !``, !0];
const False = [![], !{}, !!'', !!"", !!``, !1];

const zero = [+[], +'', +"", +``, +false, +!{}];
const one = [+!![], +!'', +!"", +!``, +true, +!!{}];
```
