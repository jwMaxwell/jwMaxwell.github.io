#define MAX(a, b) \
  ((a > b) * (a) + (a <= b) * (b))

#define MIN(a, b) \
  ((a < b) * (a) + (a >= b) * (b))

#define GRID_SIZE 257280
#define GRID_WIDTH 960
#define GRID_HEIGHT 268

float limit(float x) {
	return MAX(0, MIN(x, 1));
}

float normalize(float* arr, unsigned arr_size) {
	float sum = 0;
	for (unsigned i = 0; i < arr_size; ++i) {
		sum += arr[i];
	}
	return sum / (float)arr_size;
}
