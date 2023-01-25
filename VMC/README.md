# VMC

This project showcases my Virtual Machine Code. With this program, you can write a program in the intermediary language (a preprocessed assembly language). That program is then compiled to the Virtual Assembly language, which is then compiled into machine code (binary). Finally, the binary is executed and your program is run.

As you write your code, you can watch it compile in real time, which is pretty neat. This project uses a stack based machine code, which means that the virtual "processor" doesn't have any registers. All program memory is stored in a stack. The Assembly language is a pretty basic human interpretation of the byte code. The only difference between the Assembly and byte code (aside from appearances) are the push and pop instructions, which introduce some minor shorthand. In the Intermediary language, variables and labels are introduced, which programming much easier and make your code much more readable.

### TODO:

- Code clean up for vmc.js, asm.js, and intermediary.js
- Create tests for the VMC, ASM, and intermediary
- Create a tokenizer
- Create a grammar and parser
- Create a compiler, which use the tokenizer and parser
- Implement the compiler in the web page
- Add floating point numbers
- Add compile errors
- Add compile warnings
