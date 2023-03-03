---
title: "Array Indecies"
date: 2022-08-06T14:54:23-05:00
---
In C/C++, arrays are often used to store data in sequential memory. The data in this memory is typically accessed using the syntax `array[index]`. In traditional syntax, the variable `array` stores the memory location of the first element in the array. Because the array memory is sequential, we can access other elements of the array by adding an index to the array location. 

A less abstract form of the array syntax would be `*(array + index)`. As it turns out, traditional array syntax literally translates to the simplified form, thus allowing us to access memory with `*(index + array)` or `index[array]`. In our programs, this won't have very much significance to the way we design our code, however it does allow us to do silly things like this.
```c
#include <stdio.h>
#include <stdlib.h>
#define LENGTH 100

int main() {
  unsigned* arr = (unsigned*) malloc(LENGTH * sizeof(unsigned));
  for (unsigned i = 0; i < LENGTH;)
    arr[i] = ++i;

  // Focus on this bit
  for (unsigned i = 0; i < LENGTH; ++i) {
    unsigned a = arr[i];
    unsigned b = i[arr];
    unsigned c = *(arr + i);
    printf("a: %u, b: %u, c: %u\n", a, b, c);
  }

  return 0;
}
```
The above code will print the numbers from 0 to 99 in the following format:
```
a: 1, b: 1, c: 1
a: 2, b: 2, c: 2
a: 3, b: 3, c: 3
a: 4, b: 4, c: 4
a: 5, b: 5, c: 5
...
```
While I have yet to find any meaningful use for this trick, it is still fun to explore and consider the potential uses in obfuscation (not that obfuscation is all that important in C).
