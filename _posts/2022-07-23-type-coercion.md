---
title: "Type Coercion"
date: 2022-07-21T19:49:37-05:00
layout: page
permalink: /type-coercion/
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
Using this information, we can now create some rediculous programs. My go-to always seems to be FizzBuzz and so this is exactly what we will do.

First, I will start with a standard FizzBuzz
```js
const fizzbuzz = (x) => {
    let res = '';
    if (x % 3 === 0) res = 'Fizz';
    if (x % 5 === 0) res += 'Buzz';
    if (!res) res = x;
    return res;
}

console.log([...Array(100).keys()].map(t => t + 1).map(fizzbuzz));
```
Now that we have a base, we can start sneaking in some of our conversions
```js
const fizzbuzz = (x) => {
    let res = '';
    if (x % 3 === +false) res = 'Fizz';
    if (x % 5 === +[]) res += 'Buzz';
    if (res == !1) res = x;
    return res;
}

console.log([...Array(100).keys()].map(t => t + 1).map(fizzbuzz));
```

A code challenge for the reader:
Create FizzBuzz without explicitly using any numbers.
