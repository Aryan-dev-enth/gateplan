#include<stdio.h>
#include<stdlib.h>

struct node {
  int value;
  struct node * next;
};

typedef struct node Node;

struct node * createNode(int val) {
  struct node * newNode = malloc(sizeof(struct node));
  newNode -> value = val;
  newNode -> next = NULL;
  return newNode;
}

struct node * createListFromArray(int arr[], int arraySize) {
  struct node * rootNodePtr = createNode(arr[0]);
  struct node * lastNodePtr = rootNodePtr;

  for (int i = 1; i < arraySize; i++) {
    struct node * nodePtr = createNode(arr[i]);
    lastNodePtr -> next = nodePtr;
    lastNodePtr = lastNodePtr -> next;

  }
  return rootNodePtr;
}

void printlist(struct node * head) {
  printf("LIST:\n");
  while (head != NULL) {
    printf("%d ", head -> value);
    head = head -> next;
  }
  printf("\n");
}

int length(struct node * head) {
  int result = 0;
  for (struct node * curr = head; curr != NULL; curr = curr -> next) {
    result++;
  }
  return result;
}

void rearrange(struct node * head) {
    struct node * p, * q;
    p = head -> next;
    q = malloc(sizeof(struct node));
    q -> value = 6;
    q -> next = p -> next;
    p -> next = q;

}

int main() {
  int arr[] = {
    1,
    2,
    3
  };
  struct node * head = createListFromArray(arr, sizeof(arr) / sizeof(int));

  printlist(head);

  rearrange((head));
  printlist(head);

}
